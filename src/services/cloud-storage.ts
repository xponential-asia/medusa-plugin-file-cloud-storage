import { AbstractFileService, IFileService, Logger } from '@medusajs/medusa';
import { MedusaError } from '@medusajs/utils';
import {
  FileServiceUploadResult,
  DeleteFileType,
  UploadStreamDescriptorType,
  FileServiceGetUploadStreamResult,
  GetUploadedFileType
} from '@medusajs/types';
import { Storage, Bucket, GetSignedUrlConfig } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import stream, { Readable, PassThrough } from 'stream';
import { UploadStreamDescriptorWithPathType, UploadedJsonType } from '../types/upload-binary';
import path from 'path';
class CloudStorageService extends AbstractFileService implements IFileService {
  protected logger_: Logger;
  protected publicBucket_: Bucket;
  protected publicBucketName_: string;
  protected basePublicUrl_: string = '';
  protected privateStorage_: Storage;
  protected privateBucketName_: string;

  constructor({ logger }, options) {
    super({}, options);
    this.logger_ = logger;
    //setup storage client
    if (options.credentials) {
      this.privateStorage_ = new Storage({
        credentials: {
          client_email: options.credentials.client_email,
          private_key: options.credentials.private_key
        }
      });
    } else {
      //Use Application Default credentials
      this.privateStorage_ = new Storage();
    }
    //Setup public bucket name
    this.publicBucketName_ = options.publicBucketName;

    //Setup private bucket name
    this.privateBucketName_ = options.privateBucketName;

    //base public url for get file in internet (e.g. cdn url)
    this.basePublicUrl_ = options.basePublicUrl || '';
  }

  /**
   * This method is used to transform the Google Cloud URL to a CDN URL. (Only for public bucket)
   * @param googleCloudURL
   * @returns
   */
  transformGoogleCloudURLtoCDN(googleCloudURL: string): string {
    // Define the base URLs
    const googleCloudBaseURL = `https://storage.googleapis.com/${this.publicBucketName_}/`;

    // Extract the file identifier from the Google Cloud URL
    const fileIdentifier = googleCloudURL.replace(googleCloudBaseURL, '');

    // Construct the CDN URL
    const cdnURL = `${this.basePublicUrl_}${fileIdentifier}`;
    return cdnURL;
  }

  /**
   * This method is used to upload file(public bucket) to cloud storage.
   * @param fileData
   * @returns FileServiceUploadResult
   */
  async upload(fileData: Express.Multer.File): Promise<FileServiceUploadResult> {
    try {
      //key for use identifier when client get this
      const key = uuidv4();
      // Extracting the file name without the extension
      const fileNameWithoutExtension = path.parse(fileData.originalname).name;
      const destination = `${key}/${fileNameWithoutExtension}/${fileData.originalname}`;
      const result = await this.privateStorage_
        .bucket(this.publicBucketName_)
        .upload(fileData.path, {
          destination
        });
      //get content of file
      const [file] = result;
      const publicUrl = await file.publicUrl();
      const cdnURL = this.transformGoogleCloudURLtoCDN(publicUrl);
      return {
        url: cdnURL,
        key: destination
      };
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Upload file to bucket error.'
      );
    } finally {
      //remove file after upload
      if (fs.existsSync(fileData.path)) {
        fs.unlinkSync(fileData.path);
      }
    }
  }

  async uploadProtected(fileData: Express.Multer.File): Promise<FileServiceUploadResult> {
    try {
      //key for use identifier when client get this
      const key = uuidv4();
      // Extracting the file name without the extension
      const fileNameWithoutExtension = path.parse(fileData.originalname).name;
      const destination = `${key}/${fileNameWithoutExtension}/${fileData.originalname}`;
      const result = await this.privateStorage_
        .bucket(this.privateBucketName_)
        .upload(fileData.path, {
          destination,
          private: true
        });
      //config for generate url
      const EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes
      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + EXPIRATION_TIME
      };
      //get content of file
      const [file] = result;
      const [url] = await file.getSignedUrl(options);
      return {
        url: url,
        key: destination
      };
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Upload protected file to bucket error.'
      );
    } finally {
      //remove file after upload
      if (fs.existsSync(fileData.path)) {
        fs.unlinkSync(fileData.path);
      }
    }
  }

  async delete(fileData: DeleteFileType): Promise<void> {
    try {
      //search file in bucket
      const isPrivate = fileData?.isPrivate === undefined ? true : fileData.isPrivate;
      const file = this.privateStorage_
        .bucket(isPrivate ? this.privateBucketName_ : this.publicBucketName_)
        .file(fileData.fileKey);
      const [isExist] = await file.exists();
      if (isExist) {
        //delete
        await file.delete();
        return;
      } else {
        //not found file
        throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Not found file.');
      }
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Delete file error.'
      );
    }
  }

  async getUploadStreamDescriptor(
    fileData: UploadStreamDescriptorType
  ): Promise<FileServiceGetUploadStreamResult> {
    try {
      //key for use identifier when client get this
      const key = uuidv4();
      //init file into the bucket *fileData.name include subbucket
      const parsedFile = `${fileData.name}${fileData.ext ? `.${fileData.ext}` : ''}`;
      // Extracting the file name without the extension
      const fileNameWithoutExtension = parsedFile.replace(/\.[^/.]+$/, '');
      const destination = `${key}/${fileNameWithoutExtension}/${parsedFile}`;
      const pass = new stream.PassThrough();
      const isPrivate = fileData?.isPrivate === undefined ? true : fileData.isPrivate;
      let url = '';
      const file = this.privateStorage_
        .bucket(isPrivate ? this.privateBucketName_ : this.publicBucketName_)
        .file(destination);

      //Upload file to bucket
      const pipe = fs.createReadStream(destination).pipe(file.createWriteStream());

      //Get url of file
      if (isPrivate) {
        url = file.cloudStorageURI.href;
      } else {
        url = await file.publicUrl();
        url = this.transformGoogleCloudURLtoCDN(url);
      }

      const promise = new Promise((res, rej) => {
        pipe.on('finish', res);
        pipe.on('error', rej);
      });
      return {
        writeStream: pass,
        promise,
        url,
        fileKey: destination
      };
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Upload file stream error.'
      );
    }
  }

  async getDownloadStream(fileData: GetUploadedFileType): Promise<NodeJS.ReadableStream> {
    try {
      const isPrivate = fileData?.isPrivate === undefined ? true : fileData.isPrivate;
      const file = this.privateStorage_
        .bucket(isPrivate ? this.privateBucketName_ : this.publicBucketName_)
        .file(fileData.fileKey);

      const [isExist] = await file.exists();
      if (!isExist) {
        //Not found file
        throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Not found file.');
      }
      return file.createReadStream();
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Download stream file error.'
      );
    }
  }

  async getPresignedDownloadUrl(fileData: GetUploadedFileType): Promise<string> {
    try {
      const EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes
      const file = this.privateStorage_.bucket(this.privateBucketName_).file(fileData.fileKey);

      const [isExist] = await file.exists();
      if (!isExist) {
        //Not found file
        throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Not found file.');
      }
      //config for generate url
      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + EXPIRATION_TIME
      };
      const [url] = await file.getSignedUrl(options);
      return url;
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Download stream file error.'
      );
    }
  }

  async uploadStreamJson(fileData: UploadedJsonType): Promise<FileServiceUploadResult> {
    //key for use identifier when client get this
    const key = uuidv4();
    const jsonString = JSON.stringify(fileData.data);
    const buffer = Buffer.from(jsonString);
    const stream = Readable.from(buffer);
    //force extension to .json
    const extension = '.json';
    //force file name to be the same as the original name
    const fileName = fileData.name.replace(/\.[^/.]+$/, '');
    const destination = `${key}/${fileName}/${fileName}${extension}`;
    const isPrivate = fileData?.isPrivate === undefined ? true : fileData.isPrivate;
    const file = this.privateStorage_
      .bucket(isPrivate ? this.privateBucketName_ : this.publicBucketName_)
      .file(destination);

    //make file streaming
    const pipe = stream.pipe(file.createWriteStream());
    const pass = new PassThrough();
    stream.pipe(pass);
    const promise = new Promise((res, rej) => {
      pipe.on('finish', res);
      pipe.on('error', rej);
    });
    await promise;
    //Get url of file
    let url: string;
    if (isPrivate) {
      url = file.cloudStorageURI.href;
    } else {
      url = await file.publicUrl();
      url = this.transformGoogleCloudURLtoCDN(url);
    }
    return {
      url,
      key: destination
    };
  }

  async uploadStream(
    fileDetail: UploadStreamDescriptorWithPathType,
    arrayBuffer: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
  ): Promise<FileServiceUploadResult> {
    //key for use identifier when client get this
    const key = uuidv4();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);
    let fileName = fileDetail.name.replace(/\.[^/.]+$/, '');
    const fileNameWithoutExtension = fileName;
    fileName = fileDetail.ext ? `${fileName}.${fileDetail.ext}` : fileName;
    //check file name don't have extension
    if (!fileDetail.ext && fileName.indexOf('.') === -1) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'File name must have extension.');
    }
    // Extracting the file name without the extension
    const destination = `${key}/${fileNameWithoutExtension}/${fileName}`;
    //init file into the bucket *fileData.name include sub-bucket
    const isPrivate = fileDetail?.isPrivate === undefined ? true : fileDetail.isPrivate;
    const file = this.privateStorage_
      .bucket(isPrivate ? this.privateBucketName_ : this.publicBucketName_)
      .file(destination);

    //make file streaming
    const pipe = stream.pipe(file.createWriteStream());
    const pass = new PassThrough();
    stream.pipe(pass);
    const promise = new Promise((res, rej) => {
      pipe.on('finish', res);
      pipe.on('error', rej);
    });
    await promise;
    //Get url of file
    let url: string;
    if (isPrivate) {
      url = file.cloudStorageURI.href;
    } else {
      url = await file.publicUrl();
      url = this.transformGoogleCloudURLtoCDN(url);
    }
    return {
      url,
      key: destination
    };
  }
}

export default CloudStorageService;
