import { AbstractFileService, IFileService, Logger } from '@medusajs/medusa';
import {
  FileServiceUploadResult,
  DeleteFileType,
  UploadStreamDescriptorType,
  FileServiceGetUploadStreamResult,
  GetUploadedFileType
} from '@medusajs/types';

class CloudStorageService extends AbstractFileService implements IFileService {
  protected logger_: Logger

  constructor({ logger }, options) {
    super({}, options);

    this.logger_ = logger;
  }

  upload(fileData: Express.Multer.File): Promise<FileServiceUploadResult> {
    throw new Error('Method not implemented.');
  }
  uploadProtected(fileData: Express.Multer.File): Promise<FileServiceUploadResult> {
    throw new Error('Method not implemented.');
  }
  delete(fileData: DeleteFileType): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getUploadStreamDescriptor(
    fileData: UploadStreamDescriptorType
  ): Promise<FileServiceGetUploadStreamResult> {
    throw new Error('Method not implemented.');
  }
  getDownloadStream(fileData: GetUploadedFileType): Promise<NodeJS.ReadableStream> {
    throw new Error('Method not implemented.');
  }
  getPresignedDownloadUrl(fileData: GetUploadedFileType): Promise<string> {
    throw new Error('Method not implemented.');
  }
}

export default CloudStorageService;
