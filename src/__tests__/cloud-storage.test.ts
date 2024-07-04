import CloudStorageService from '../services/cloud-storage';
import { PassThrough, Readable } from 'stream';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { UploadStreamDescriptorWithPathType, UploadedJsonType } from '../types/upload-binary';

// Mock the entire uuid module
jest.mock('uuid');
// Mock the entire fs module
jest.mock('fs');

const publicBucketName = 'mock-public-bucket';
const privateBucketName = 'mock-private-bucket';
const basePublicUrl = 'https://cdn.com/asset/';
describe('Cloud Storage Application Default credentials', () => {
  const credentials = null;
  let cloudStorageServiceDefaultApplicationCredentials;
  beforeEach(() => {
    // Mock the logger
    const logger = {
      info: jest.fn(),
      error: jest.fn()
    };

    // Create an instance of CloudStorageService with mock options
    cloudStorageServiceDefaultApplicationCredentials = new CloudStorageService(
      { logger },
      { credentials, publicBucketName, privateBucketName, basePublicUrl }
    );
  });
  it('should be able to upload file to cloud storage with publicRead', async () => {
    //Mock file data
    const fileData = {
      path: 'src/__tests__/test-files/test-file-1.txt',
      originalname: 'test-file-1.txt'
    } as Express.Multer.File;

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    // Mock the necessary parts of the @google-cloud/storage library
    cloudStorageServiceDefaultApplicationCredentials.privateStorage_.bucket = jest
      .fn()
      .mockReturnValue({
        upload: jest.fn().mockResolvedValue([
          {
            publicUrl: jest
              .fn()
              .mockResolvedValue('https://test.com/mock-bucket/uuid/test-file-1.txt'),
            cloudStorageURI: {
              href: `gs://${privateBucketName}/uuid/${fileData.originalname}`
            }
          }
        ])
      });

    //Mock resolve public CDN url
    cloudStorageServiceDefaultApplicationCredentials.transformGoogleCloudURLtoCDN = jest
      .fn()
      .mockReturnValue('https://cdn.com/asset/uuid/test-file-1.txt');

    //Call upload function
    const result = await cloudStorageServiceDefaultApplicationCredentials.upload(fileData);

    // Assertions based on your implementation
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.key).toBeDefined();
    expect(
      cloudStorageServiceDefaultApplicationCredentials.privateStorage_.bucket().upload
    ).toHaveBeenCalledWith('src/__tests__/test-files/test-file-1.txt', {
      destination: 'uuid-value/test-file-1/test-file-1.txt'
    });
    expect(result).toMatchObject({
      url: `${basePublicUrl}uuid/test-file-1.txt`,
      key: `uuid-value/test-file-1/${fileData.originalname}`
    });
  });
});

describe('Cloud Storage', () => {
  const rootBucketName = 'mock-bucket';
  const credentials = {
    client_email: 'test-client_email',
    private_key: 'test-private_key'
  };

  let cloudStorageService;
  beforeEach(() => {
    // Mock the logger
    const logger = {
      info: jest.fn(),
      error: jest.fn()
    };

    // Create an instance of CloudStorageService with mock options
    cloudStorageService = new CloudStorageService(
      { logger },
      { credentials, publicBucketName, privateBucketName, basePublicUrl }
    );
  });

  it('should be able to upload file to cloud storage with publicRead', async () => {
    //Mock file data
    const fileData = {
      path: 'src/__tests__/test-files/test-file-1.txt',
      originalname: 'test-file-1.txt'
    } as Express.Multer.File;

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    // Mock the necessary parts of the @google-cloud/storage library
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValueOnce([
        {
          publicUrl: jest
            .fn()
            .mockResolvedValueOnce('https://test.com/mock-bucket/uuid/test-file-1.txt'),
          cloudStorageURI: {
            href: `gs://${rootBucketName}/uuid/${fileData.originalname}`
          }
        }
      ])
    });

    //Mock resolve public CDN url
    cloudStorageService.transformGoogleCloudURLtoCDN = jest
      .fn()
      .mockReturnValue('https://cdn.com/asset/uuid/test-file-1.txt');

    //Call upload function
    const result = await cloudStorageService.upload(fileData);

    // Assertions based on your implementation
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.key).toBeDefined();
    expect(cloudStorageService.privateStorage_.bucket().upload).toHaveBeenCalledWith(
      'src/__tests__/test-files/test-file-1.txt',
      {
        destination: 'uuid-value/test-file-1/test-file-1.txt'
      }
    );
    expect(result).toMatchObject({
      url: `${basePublicUrl}uuid/test-file-1.txt`,
      key: `uuid-value/test-file-1/${fileData.originalname}`
    });
  });

  test('should throw an error during upload', async () => {
    // Mock the necessary parts of the @google-cloud/storage library
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      upload: jest.fn().mockImplementationOnce(() => {
        throw new Error('Simulated upload error');
      })
    });

    // Mock Express.Multer.File object
    const mockFileData = {
      path: 'src/__tests__/mock-file.jpg',
      originalname: 'mock-file.jpg'
    };

    // Use expect().rejects.toThrow to assert that the upload method throws an error
    await expect(() => cloudStorageService.upload(mockFileData)).rejects.toThrow(
      'Simulated upload error'
    );
  });

  it('should be able to upload file to cloud storage with protected path', async () => {
    // Mock Express.Multer.File object
    const mockFileData = {
      path: 'src/__tests__/mock-file.jpg',
      originalname: 'mock-file.jpg'
    };
    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue([
        {
          getSignedUrl: jest
            .fn()
            .mockResolvedValue(['https://test.com/mock-bucket/uuid/mock-file/mock-file.jpg'])
        }
      ])
    });

    //Call upload function
    const result = await cloudStorageService.uploadProtected(mockFileData);

    // Assertions
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.key).toBeDefined();
    const uploadMock = cloudStorageService.privateStorage_.bucket().upload;
    expect(uploadMock).toHaveBeenCalledWith('src/__tests__/mock-file.jpg', {
      destination: 'uuid-value/mock-file/mock-file.jpg',
      private: true
    });
    expect(result).toEqual({
      url: 'https://test.com/mock-bucket/uuid/mock-file/mock-file.jpg',
      key: `uuid-value/mock-file/${mockFileData.originalname}`
    });
  });

  test('should throw an error during upload protected', async () => {
    // Mock the necessary parts of the @google-cloud/storage library
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      upload: jest.fn().mockImplementationOnce(() => {
        throw new Error('Simulated upload protected error');
      })
    });

    // Mock Express.Multer.File object
    const mockFileData = {
      path: 'src/__tests__/mock-file.jpg',
      originalname: 'mock-file.jpg'
    };

    // Use expect().rejects.toThrow to assert that the upload method throws an error
    await expect(() => cloudStorageService.uploadProtected(mockFileData)).rejects.toThrow(
      'Simulated upload protected error'
    );
  });

  it('should be able to delete file from cloud storage (public)', async () => {
    const originalname = 'mock-file.jpg';
    const mockFileData = {
      fileKey: `uuid/${originalname}`,
      originalname,
      isPrivate: false
    };

    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      delete: jest.fn().mockImplementation(async () => {
        // mock delete function
        return;
      })
    };

    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValueOnce(mockObjFile)
    });
    await cloudStorageService.delete(mockFileData);

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(publicBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      `uuid/${originalname}`
    );
    expect(mockObjFile.exists).toHaveBeenCalled();
    expect(mockObjFile.delete).toHaveBeenCalled();
  });

  it('should be able to delete file from cloud storage (private)', async () => {
    const originalname = 'mock-file.jpg';
    const mockFileData = {
      fileKey: `uuid/${originalname}`,
      originalname,
      isPrivate: true
    };

    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      delete: jest.fn().mockImplementation(async () => {
        // mock delete function
        return;
      })
    };

    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValueOnce(mockObjFile)
    });
    await cloudStorageService.delete(mockFileData);

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      `uuid/${originalname}`
    );
    expect(mockObjFile.exists).toHaveBeenCalled();
    expect(mockObjFile.delete).toHaveBeenCalled();
  });

  test('should throw error when delete non-existing file', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([false])
    };

    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValueOnce(mockObjFile)
    });

    // Call the delete method
    await expect(() =>
      cloudStorageService.delete({ fileKey: 'non-existent-file.txt' })
    ).rejects.toThrow('Not found file.');

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      'non-existent-file.txt'
    );
    expect(mockObjFile.exists).toHaveBeenCalled();
    expect(mockObjFile.exists).toHaveBeenCalledWith();
  });

  test('should throw error for delete failure', async () => {
    // Mock the bucket and file objects
    const mockFile = {
      exists: jest.fn().mockResolvedValue([true]),
      delete: jest.fn().mockRejectedValue(new Error('Delete failed'))
    };

    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValueOnce(mockFile)
    });

    // Call the delete method
    await expect(() =>
      cloudStorageService.delete({ fileKey: 'test-file-key.txt' })
    ).rejects.toThrow('Delete failed');

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      'test-file-key.txt'
    );
    expect(mockFile.exists).toHaveBeenCalled();
    expect(mockFile.delete).toHaveBeenCalled();
  });

  test('should create upload stream public descriptor (public)', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'mock-file',
      ext: 'txt',
      isPrivate: false
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    const mReadStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, handler) => {
        return this;
      })
    };
    (fs.createReadStream as jest.Mock).mockReturnValue(mReadStream);

    const mockFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      cloudStorageURI: {
        href: 'mocked-uri'
      },
      publicUrl: jest.fn().mockResolvedValue('mocked-public-url')
    };
    // Mock the bucket object directly on the CloudStorageService instance
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockFile)
    });

    const result = await cloudStorageService.getUploadStreamDescriptor(fileData);

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(publicBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      'uuid-value/mock-file/mock-file.txt'
    );
    expect(
      cloudStorageService.privateStorage_.bucket().file().createWriteStream
    ).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).toHaveBeenCalled();

    // Assuming you have more detailed assertions for the result
    expect(result).toHaveProperty('writeStream', expect.any(PassThrough));
    expect(result).toHaveProperty('promise', expect.any(Promise));
    expect(result).toHaveProperty('url', `${basePublicUrl}mocked-public-url`);
    expect(result).toHaveProperty('fileKey', 'uuid-value/mock-file/mock-file.txt');
  });

  test('should create upload stream private descriptor (private)', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'mock-file',
      ext: 'txt',
      isPrivate: true
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    const mReadStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, handler) => {
        return this;
      })
    };
    (fs.createReadStream as jest.Mock).mockReturnValue(mReadStream);

    const mockFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      cloudStorageURI: {
        href: 'mocked-private-url'
      },
      publicUrl: jest.fn().mockResolvedValue('mocked-public-url')
    };
    // Mock the bucket object directly on the CloudStorageService instance
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockFile)
    });
    const result = await cloudStorageService.getUploadStreamDescriptor(fileData);

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      'uuid-value/mock-file/mock-file.txt'
    );
    expect(
      cloudStorageService.privateStorage_.bucket().file().createWriteStream
    ).toHaveBeenCalled();

    // Assuming you have more detailed assertions for the result
    expect(result).toHaveProperty('writeStream', expect.any(PassThrough));
    expect(result).toHaveProperty('promise', expect.any(Promise));
    expect(result).toHaveProperty('url', 'mocked-private-url');
    expect(result).toHaveProperty('fileKey', 'uuid-value/mock-file/mock-file.txt');
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).not.toHaveBeenCalled();
  });

  test('should create upload stream descriptor during write in gcp process error', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'mock-file',
      ext: 'txt',
      isPrivate: false
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    const mReadStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, handler) => {
        return this;
      })
    };
    (fs.createReadStream as jest.Mock).mockReturnValue(mReadStream);

    // Mock fs.createReadStream to throw an error
    jest.spyOn(fs, 'createReadStream').mockImplementation(() => {
      throw new Error('Mocked createReadStream error');
    });

    const mockFile = {
      createWriteStream: jest
        .fn()
        .mockRejectedValue(new Error('Upload file stream error when createWriteStream')),
      cloudStorageURI: {
        href: 'mocked-uri'
      },
      publicUrl: jest.fn().mockRejectedValue(new Error('Upload file stream error when publicUrl'))
    };
    // Mock the bucket object directly on the CloudStorageService instance
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockFile)
    });
    await expect(() => cloudStorageService.getUploadStreamDescriptor(fileData)).rejects.toThrow(
      'Mocked createReadStream error'
    );

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      'uuid-value/mock-file/mock-file.txt'
    );
    expect(
      cloudStorageService.privateStorage_.bucket().file().createWriteStream
    ).not.toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).not.toHaveBeenCalled();
  });

  test('should create upload stream descriptor during promise pipe in process error (public)', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'mock-file',
      ext: 'txt',
      isPrivate: false
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    const mReadStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockRejectedValue(new Error('Upload file stream error when createWriteStream'))
    };
    (fs.createReadStream as jest.Mock).mockReturnValue(mReadStream);
    // Mock fs.createReadStream to throw an error
    jest.spyOn(fs, 'createReadStream').mockImplementation(() => {
      throw new Error('Mocked createReadStream error');
    });

    const mockFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      cloudStorageURI: {
        href: 'mocked-uri'
      },
      publicUrl: jest.fn().mockResolvedValue('mocked-public-url')
    };
    // Mock the bucket object directly on the CloudStorageService instance
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockFile)
    });
    await expect(() => cloudStorageService.getUploadStreamDescriptor(fileData)).rejects.toThrow(
      'Mocked createReadStream error'
    );

    // Assertions
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      'uuid-value/mock-file/mock-file.txt'
    );
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).not.toHaveBeenCalled();
    expect(
      cloudStorageService.privateStorage_.bucket().file().createWriteStream
    ).not.toHaveBeenCalled();
  });

  it('should be able to get download stream (private)', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      createReadStream: jest.fn().mockReturnValue(new PassThrough())
    };
    const fileData = {
      fileKey: 'existing-file.txt',
      isPrivate: true
    };

    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });
    // Call the download stream method
    const result = await cloudStorageService.getDownloadStream(fileData);
    // Assertions
    expect(result).toBeDefined();
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      fileData.fileKey
    );
    expect(cloudStorageService.privateStorage_.bucket().file().exists).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().createReadStream).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Readable);
  });

  it('should throw an error when the file does not exist (private)', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([false]),
      createReadStream: jest.fn().mockReturnValue(new PassThrough())
    };
    const fileData = {
      fileKey: 'non-existent-file.txt',
      isPrivate: true
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });

    // Assertions and Call API
    await expect(cloudStorageService.getDownloadStream(fileData)).rejects.toThrow(
      'Not found file.'
    );
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      fileData.fileKey
    );
    expect(cloudStorageService.privateStorage_.bucket().file().exists).toHaveBeenCalled();
    expect(
      cloudStorageService.privateStorage_.bucket().file().createReadStream
    ).not.toHaveBeenCalled();
  });

  it('should throw an error when an error occurs during the process download stream (public)', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      createReadStream: jest.fn().mockRejectedValue(new Error('Download stream file error'))
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });
    const fileData = {
      fileKey: 'error-file.txt',
      isPrivate: false
    };

    // Assertions and Call API
    await expect(cloudStorageService.getDownloadStream(fileData)).rejects.toThrow(
      'Download stream file error'
    );
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(publicBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      fileData.fileKey
    );
    expect(cloudStorageService.privateStorage_.bucket().file().exists).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().createReadStream).toHaveBeenCalled();
  });
  it('should be able to get download presigned url', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue(['https://test.com/mock-bucket/uuid/existent-file.txt'])
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });
    const fileData = {
      fileKey: 'existent-file.txt'
    };

    // Call the download presigned url method
    const result = await cloudStorageService.getPresignedDownloadUrl(fileData);

    // Assertions
    expect(result).toBeDefined();
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      fileData.fileKey
    );
    expect(cloudStorageService.privateStorage_.bucket().file().exists).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().getSignedUrl).toHaveBeenCalled();
    expect(result).toEqual('https://test.com/mock-bucket/uuid/existent-file.txt');
  });

  test('should throw an error when the file does not exist', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([false]),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue(['https://test.com/mock-bucket/uuid/existent-file.txt'])
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });
    const fileData = {
      fileKey: 'non-existent-file.txt'
    };

    // Assertions and Call API
    await expect(cloudStorageService.getPresignedDownloadUrl(fileData)).rejects.toThrow(
      'Not found file.'
    );
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      fileData.fileKey
    );
    expect(cloudStorageService.privateStorage_.bucket().file().exists).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().getSignedUrl).not.toHaveBeenCalled();
  });

  test('should throw an error when an error occurs during the process download presigned url', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue(['https://test.com/mock-bucket/uuid/existent-file.txt'])
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });
    const fileData = {
      fileKey: 'error-file.txt'
    };
    cloudStorageService.privateStorage_.bucket()
      .file()
      .exists.mockRejectedValue(new Error('Download presigned url error'));

    await expect(cloudStorageService.getPresignedDownloadUrl(fileData)).rejects.toThrow(
      'Download presigned url error'
    );

    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(
      fileData.fileKey
    );
    expect(cloudStorageService.privateStorage_.bucket().file().exists).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().getSignedUrl).not.toHaveBeenCalled();
  });

  test('should success upload stream json with data (public)', async () => {
    const dataMock = {
      data: {
        test: 'test-data-json'
      },
      path: 'import-product',
      name: 'test02.json',
      isPrivate: false
    } as UploadedJsonType;
    const mockExpectedValue = {
      url: `${basePublicUrl}/test02/test02.json`,
      key: 'uuid-value/test02/test02.json'
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    const extension = '.json';
    const fileName = dataMock.name.replace(/\.[^/.]+$/, '');
    const destinationMock = `uuid-value/${fileName}/${fileName}${extension}`;
    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });

    //Mock resolve public CDN url
    cloudStorageService.transformGoogleCloudURLtoCDN = jest
      .fn()
      .mockReturnValue(`${basePublicUrl}/test02/test02.json`);

    const result = await cloudStorageService.uploadStreamJson(dataMock);

    //Assertions
    expect(result).toEqual(mockExpectedValue);
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(publicBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(destinationMock);
    expect(cloudStorageService.privateStorage_.bucket().file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).toHaveBeenCalled();
  });

  test('should success upload stream json with data (private)', async () => {
    const dataMock = {
      data: {
        test: 'test-data-json'
      },
      path: 'import-product',
      name: 'test02.json',
      isPrivate: true
    } as UploadedJsonType;
    const mockExpectedValue = {
      url: 'https://test.com/mock-bucket/uuid/test02.json',
      key: 'import-product/test02.json'
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });

    const result = await cloudStorageService.uploadStreamJson(dataMock);

    //Assertions
    expect(result).toEqual({
      url: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`,
      key: 'uuid-value/test02/test02.json'
    });
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith('uuid-value/test02/test02.json');
    expect(cloudStorageService.privateStorage_.bucket().file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).not.toHaveBeenCalled();
  });

  test('should success upload with stream data (public)', async () => {
    const dataMock = {
      path: 'import-product',
      name: 'test.json',
      ext: 'json',
      isPrivate: false
    } as UploadStreamDescriptorWithPathType;
    const mockExpectedValue = {
      url: 'https://cdn.com/asset//test/test.json',
      key: 'uuid-value/test/test.json'
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });

    //Mock resolve public CDN url
    cloudStorageService.transformGoogleCloudURLtoCDN = jest
      .fn()
      .mockReturnValue(`${basePublicUrl}/test/test.json`);

    const result = await cloudStorageService.uploadStream(dataMock, Buffer.from('test'));

    //Assertions
    expect(result).toEqual(mockExpectedValue);
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(publicBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(mockExpectedValue.key);
    expect(cloudStorageService.privateStorage_.bucket().file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).toHaveBeenCalled();
  });

  test('should success upload with stream data (private)', async () => {
    const dataMock = {
      path: 'import-product',
      name: 'test.json',
      ext: 'json',
      isPrivate: true
    } as UploadStreamDescriptorWithPathType;
    const mockExpectedValue = {
      url: 'https://test.com/mock-bucket/uuid/test.json',
      key: 'uuid-value/test/test.json'
    };

    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });

    const result = await cloudStorageService.uploadStream(dataMock, Buffer.from('test'));

    //Assertions
    expect(result).toEqual({
      ...mockExpectedValue,
      url: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
    });
    expect(cloudStorageService.privateStorage_.bucket).toHaveBeenCalledWith(privateBucketName);
    expect(cloudStorageService.privateStorage_.bucket().file).toHaveBeenCalledWith(mockExpectedValue.key);
    expect(cloudStorageService.privateStorage_.bucket().file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).not.toHaveBeenCalled();
  });

  test('should throw an error when upload with stream data empty extension (public)', async () => {
    const dataMock = {
      path: 'import-product',
      name: 'test',
      isPrivate: false
    } as UploadStreamDescriptorWithPathType;
    const mockExpectedValue = {
      url: 'https://cdn.com/asset//test/test.json',
      key: 'uuid-value/test/test.json'
    };
    
    // Mock the implementation of uuidv4
    uuidv4.mockReturnValue('uuid-value');

    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.privateStorage_.bucket = jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue(mockObjFile)
    });

    //Assertions
    await expect(cloudStorageService.uploadStream(dataMock, Buffer.from('test'))).rejects.toThrow(
      'File name must have extension.'
    );
    expect(cloudStorageService.privateStorage_.bucket().file).not.toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().createWriteStream).not.toHaveBeenCalled();
    expect(cloudStorageService.privateStorage_.bucket().file().publicUrl).not.toHaveBeenCalled();
  });
});
