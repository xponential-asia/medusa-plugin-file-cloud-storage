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
import stream from 'stream';
class CloudStorageService extends AbstractFileService implements IFileService {
  protected logger_: Logger;
  protected storage_: Storage;
  protected bucket_: Bucket;
  protected bucketName_: string;

  constructor({ logger }, options) {
    super({}, options);
    this.logger_ = logger;
    //setup storage client
    this.storage_ = new Storage({
      credentials: {
        client_email: options.credentials.client_email,
        private_key: options.credentials.private_key
      }
    });
    this.bucketName_ = options.bucketName;
    this.bucket_ = this.storage_.bucket(this.bucketName_);
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
      const destination = `${key}/${fileData.originalname}`;
      const result = await this.bucket_.upload(fileData.path, {
        destination,
        metadata: {
          predefinedAcl: 'publicRead'
        },
        public: true
      });
      //get content of file
      const [file] = result;
      const publicUrl = await file.publicUrl();
      return {
        url: publicUrl,
        key: destination
      };
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Upload file to bucket error.'
      );
    }
  }

  async uploadProtected(fileData: Express.Multer.File): Promise<FileServiceUploadResult> {
    try {
      // //key for use identifier when client get this
      const key = uuidv4();
      const destination = `${key}/${fileData.originalname}`;
      const result = await this.bucket_.upload(fileData.path, {
        destination,
        private: true
      });
      //get content of file
      const [file] = result;
      const url = file.cloudStorageURI.href; //gs://skyshift-medusa-dev/3fc54eb0-09f7-427a-9b03-b936b4254779/README.md
      return {
        url: url,
        key: destination
      };
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error?.message || 'Upload protected file to bucket error.'
      );
    }
  }

  async delete(fileData: DeleteFileType): Promise<void> {
    try {
      //search file in bucket
      const file = this.bucket_.file(fileData.fileKey);
      const [isExist] = await file.exists();
      if (isExist) {
        //delete
        await file.delete();
        return;
      } else {
        //not found file
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND, 'Not found file.'
        );
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
      //init file into the bucket *fileData.name include subbucket
      const parsedFile = `${fileData.name}${fileData.ext ? `.${fileData.ext}` : ''}`;
      const pass = new stream.PassThrough();
      const isPrivate = fileData?.isPrivate;
      let url = '';
      const file = this.bucket_.file(parsedFile);
      const options = {
        metadata: {
          predefinedAcl: isPrivate ? 'private' : 'publicRead'
        },
        private: isPrivate,
        public: !isPrivate
      };

      //Upload file to bucket
      const pipe = fs.createReadStream(parsedFile).pipe(file.createWriteStream(options));

      //Get url of file
      if (isPrivate) {
        url = file.cloudStorageURI.href;
      } else {
        url = await file.publicUrl();
      }

      const promise = new Promise((res, rej) => {
        pipe.on('finish', res);
        pipe.on('error', rej);
      });
      return {
        writeStream: pass,
        promise,
        url,
        fileKey: parsedFile
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
      const file = this.bucket_.file(fileData.fileKey);
      const [isExist] = await file.exists();
      if (!isExist) {
        //Not found file
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND, 'Not found file.'
        );
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
      const file = this.bucket_.file(fileData.fileKey);
      const [isExist] = await file.exists();
      if (!isExist) {
        //Not found file
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND, 'Not found file.'
        );
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
}

export default CloudStorageService;
