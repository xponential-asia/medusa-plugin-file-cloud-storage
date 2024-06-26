import CloudStorageService from '../services/cloud-storage';
import { PassThrough, Readable } from 'stream';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { UploadStreamDescriptorWithPathType, UploadedJsonType } from '../types/upload-binary';

// Mock the entire uuid module
jest.mock('uuid');
// Mock the entire fs module
jest.mock('fs');

describe('Cloud Storage Application Default credentials', () => {
  const rootBucketName = 'mock-bucket';
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
      { credentials, bucketName: rootBucketName }
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
    cloudStorageServiceDefaultApplicationCredentials.bucket_.upload = jest.fn().mockResolvedValue([
      {
        publicUrl: jest.fn().mockResolvedValue('https://test.com/mock-bucket/uuid/test-file-1.txt'),
        cloudStorageURI: {
          href: `gs://${rootBucketName}/uuid/${fileData.originalname}`
        }
      }
    ]);

    //Call upload function
    const result = await cloudStorageServiceDefaultApplicationCredentials.upload(fileData);

    // Assertions based on your implementation
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.key).toBeDefined();
    expect(cloudStorageServiceDefaultApplicationCredentials.bucket_.upload).toHaveBeenCalledWith(
      'src/__tests__/test-files/test-file-1.txt',
      {
        destination: expect.stringContaining('test-file-1.txt'),
        metadata: {
          predefinedAcl: 'publicRead'
        },
        public: true
      }
    );
    expect(result).toMatchObject({
      url: 'https://test.com/mock-bucket/uuid/test-file-1.txt',
      key: `uuid-value/${fileData.originalname}`
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
      { credentials, bucketName: rootBucketName }
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
    cloudStorageService.bucket_.upload = jest.fn().mockResolvedValue([
      {
        publicUrl: jest.fn().mockResolvedValue('https://test.com/mock-bucket/uuid/test-file-1.txt'),
        cloudStorageURI: {
          href: `gs://${rootBucketName}/uuid/${fileData.originalname}`
        }
      }
    ]);

    //Call upload function
    const result = await cloudStorageService.upload(fileData);

    // Assertions based on your implementation
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.key).toBeDefined();
    expect(cloudStorageService.bucket_.upload).toHaveBeenCalledWith(
      'src/__tests__/test-files/test-file-1.txt',
      {
        destination: expect.stringContaining('test-file-1.txt'),
        metadata: {
          predefinedAcl: 'publicRead'
        },
        public: true
      }
    );
    expect(result).toMatchObject({
      url: 'https://test.com/mock-bucket/uuid/test-file-1.txt',
      key: `uuid-value/${fileData.originalname}`
    });
  });

  test('should throw an error during upload', async () => {
    // Mock the necessary parts of the @google-cloud/storage library
    cloudStorageService.bucket_.upload = jest.fn().mockImplementation(() => {
      throw new Error('Simulated upload error');
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

    cloudStorageService.bucket_.upload = jest.fn().mockResolvedValue([
      {
        getSignedUrl: jest
          .fn()
          .mockResolvedValue(['https://test.com/mock-bucket/uuid/mock-file.jpg'])
      }
    ]);

    //Call upload function
    const result = await cloudStorageService.uploadProtected(mockFileData);

    // Assertions
    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.key).toBeDefined();
    expect(cloudStorageService.bucket_.upload).toHaveBeenCalledWith('src/__tests__/mock-file.jpg', {
      destination: expect.stringContaining('mock-file.jpg'),
      private: true
    });
    expect(result).toEqual({
      url: 'https://test.com/mock-bucket/uuid/mock-file.jpg',
      key: `uuid-value/${mockFileData.originalname}`
    });
  });

  test('should throw an error during upload protected', async () => {
    // Mock the necessary parts of the @google-cloud/storage library
    cloudStorageService.bucket_.upload = jest.fn().mockImplementation(() => {
      throw new Error('Simulated upload protected error');
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

  it('should be able to delete file from cloud storage', async () => {
    const originalname = 'mock-file.jpg';
    const mockFileData = {
      fileKey: `uuid/${originalname}`,
      originalname
    };

    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      delete: jest.fn().mockImplementation(async () => {
        // mock delete function
        return;
      })
    };

    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);
    await cloudStorageService.delete(mockFileData);

    // Assertions
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(`uuid/${originalname}`);
    expect(mockObjFile.exists).toHaveBeenCalled();
    expect(mockObjFile.delete).toHaveBeenCalled();
  });

  test('should throw error when delete non-existing file', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([false])
    };

    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);

    // Call the delete method
    await expect(() =>
      cloudStorageService.delete({ fileKey: 'non-existent-file.txt' })
    ).rejects.toThrow('Not found file.');

    // Assertions
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith('non-existent-file.txt');
    expect(mockObjFile.exists).toHaveBeenCalled();
    expect(mockObjFile.exists).toHaveBeenCalledWith();
  });

  test('should throw error for delete failure', async () => {
    // Mock the bucket and file objects
    const mockFile = {
      exists: jest.fn().mockResolvedValue([true]),
      delete: jest.fn().mockRejectedValue(new Error('Delete failed'))
    };

    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockFile);

    // Call the delete method
    await expect(() =>
      cloudStorageService.delete({ fileKey: 'test-file-key.txt' })
    ).rejects.toThrow('Delete failed');

    // Assertions
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith('test-file-key.txt');
    expect(mockFile.exists).toHaveBeenCalled();
    expect(mockFile.delete).toHaveBeenCalled();
  });

  test('should create upload stream public descriptor', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'path/to/mock-file',
      ext: 'txt',
      isPrivate: false
    };
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
    cloudStorageService.bucket_ = {
      file: jest.fn().mockReturnValue(mockFile)
    };
    const result = await cloudStorageService.getUploadStreamDescriptor(fileData);

    // Assertions
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith('path/to/mock-file.txt');
    expect(cloudStorageService.bucket_.file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().publicUrl).toHaveBeenCalled();

    // Assuming you have more detailed assertions for the result
    expect(result).toHaveProperty('writeStream', expect.any(PassThrough));
    expect(result).toHaveProperty('promise', expect.any(Promise));
    expect(result).toHaveProperty('url', 'mocked-public-url');
    expect(result).toHaveProperty('fileKey', 'path/to/mock-file.txt');
  });

  test('should create upload stream private descriptor', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'path/to/mock-file',
      ext: 'txt',
      isPrivate: true
    };
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
    cloudStorageService.bucket_ = {
      file: jest.fn().mockReturnValue(mockFile)
    };
    const result = await cloudStorageService.getUploadStreamDescriptor(fileData);

    // Assertions
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith('path/to/mock-file.txt');
    expect(cloudStorageService.bucket_.file().createWriteStream).toHaveBeenCalled();

    // Assuming you have more detailed assertions for the result
    expect(result).toHaveProperty('writeStream', expect.any(PassThrough));
    expect(result).toHaveProperty('promise', expect.any(Promise));
    expect(result).toHaveProperty('url', 'mocked-private-url');
    expect(result).toHaveProperty('fileKey', 'path/to/mock-file.txt');
    expect(cloudStorageService.bucket_.file().publicUrl).not.toHaveBeenCalled();
  });

  test('should create upload stream descriptor during write in gcp process error', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'path/to/mock-file',
      ext: 'txt',
      isPrivate: false
    };
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
    cloudStorageService.bucket_ = {
      file: jest.fn().mockReturnValue(mockFile)
    };
    await expect(() => cloudStorageService.getUploadStreamDescriptor(fileData)).rejects.toThrow(
      'Mocked createReadStream error'
    );

    // Assertions
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith('path/to/mock-file.txt');
    expect(cloudStorageService.bucket_.file().createWriteStream).not.toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().publicUrl).not.toHaveBeenCalled();
  });

  test('should create upload stream descriptor during promise pipe in process error', async () => {
    // Mock the storage and bucket objects
    const fileData = {
      name: 'path/to/mock-file',
      ext: 'txt',
      isPrivate: false
    };
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
    cloudStorageService.bucket_ = {
      file: jest.fn().mockReturnValue(mockFile)
    };
    await expect(() => cloudStorageService.getUploadStreamDescriptor(fileData)).rejects.toThrow(
      'Mocked createReadStream error'
    );

    // Assertions
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith('path/to/mock-file.txt');
    expect(cloudStorageService.bucket_.file().publicUrl).not.toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().createWriteStream).not.toHaveBeenCalled();
  });

  it('should be able to get download stream', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      createReadStream: jest.fn().mockReturnValue(new PassThrough())
    };
    const fileData = {
      fileKey: 'existing-file.txt'
    };

    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);
    // Call the download stream method
    const result = await cloudStorageService.getDownloadStream(fileData);
    // Assertions
    expect(result).toBeDefined();

    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(fileData.fileKey);
    expect(cloudStorageService.bucket_.file().exists).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().createReadStream).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Readable);
  });

  it('should throw an error when the file does not exist', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([false]),
      createReadStream: jest.fn().mockReturnValue(new PassThrough())
    };
    const fileData = {
      fileKey: 'non-existent-file.txt'
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);

    // Assertions and Call API
    await expect(cloudStorageService.getDownloadStream(fileData)).rejects.toThrow(
      'Not found file.'
    );

    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(fileData.fileKey);
    expect(cloudStorageService.bucket_.file().exists).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().createReadStream).not.toHaveBeenCalled();
  });

  it('should throw an error when an error occurs during the process download stream', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      createReadStream: jest.fn().mockRejectedValue(new Error('Download stream file error'))
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);
    const fileData = {
      fileKey: 'error-file.txt'
    };

    // Assertions and Call API
    await expect(cloudStorageService.getDownloadStream(fileData)).rejects.toThrow(
      'Download stream file error'
    );

    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(fileData.fileKey);
    expect(cloudStorageService.bucket_.file().exists).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().createReadStream).toHaveBeenCalled();
  });
  it('should be able to get download presigned url', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue(['https://test.com/mock-bucket/uuid/existent-file.txt'])
    };
    const EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes
    const date = Date.now();

    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);
    const fileData = {
      fileKey: 'existent-file.txt'
    };

    // Call the download presigned url method
    const result = await cloudStorageService.getPresignedDownloadUrl(fileData);

    // Assertions
    expect(result).toBeDefined();
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(fileData.fileKey);
    expect(cloudStorageService.bucket_.file().exists).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().getSignedUrl).toHaveBeenCalled();
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
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);
    const fileData = {
      fileKey: 'non-existent-file.txt'
    };

    // Assertions and Call API
    await expect(cloudStorageService.getPresignedDownloadUrl(fileData)).rejects.toThrow(
      'Not found file.'
    );

    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(fileData.fileKey);
    expect(cloudStorageService.bucket_.file().exists).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().getSignedUrl).not.toHaveBeenCalled();
  });

  test('should throw an error when an error occurs during the process download presigned url', async () => {
    // Mock the bucket and file objects
    const mockObjFile = {
      exists: jest.fn().mockResolvedValue([true]),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue(['https://test.com/mock-bucket/uuid/existent-file.txt'])
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);
    const fileData = {
      fileKey: 'error-file.txt'
    };
    cloudStorageService.bucket_
      .file()
      .exists.mockRejectedValue(new Error('Download presigned url error'));

    await expect(cloudStorageService.getPresignedDownloadUrl(fileData)).rejects.toThrow(
      'Download presigned url error'
    );

    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(fileData.fileKey);
    expect(cloudStorageService.bucket_.file().exists).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().getSignedUrl).not.toHaveBeenCalled();
  });

  test('should success upload stream json with data (public)', async () => {
    const dataMock = {
      data: {
        test: 'test-data-json'
      },
      path: 'import-product',
      name: 'test02.json'
    } as UploadedJsonType;
    const mockExpectedValue = {
      url: 'https://test.com/mock-bucket/uuid/test02.json',
      key: 'import-product/test02.json'
    };
    const extension = '.json';
    const fileName = dataMock.name.replace(/\.[^/.]+$/, '');
    const destinationMock = `${dataMock.path}/${fileName}${extension}`;
    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);

    const result = await cloudStorageService.uploadStreamJson(dataMock);

    //Assertions
    expect(result).toEqual(mockExpectedValue);
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(destinationMock);
    expect(cloudStorageService.bucket_.file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().publicUrl).toHaveBeenCalled();
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
    const extension = '.json';
    const fileName = dataMock.name.replace(/\.[^/.]+$/, '');
    const destinationMock = `${dataMock.path}/${fileName}${extension}`;
    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);

    const result = await cloudStorageService.uploadStreamJson(dataMock);

    //Assertions
    expect(result).toEqual({
      ...mockExpectedValue,
      url: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
    });
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(destinationMock);
    expect(cloudStorageService.bucket_.file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().publicUrl).not.toHaveBeenCalled();
  });

  test('should success upload with stream data (public)', async () => {
    const dataMock = {
      path: 'import-product',
      name: 'test.json',
      ext: 'json'
    } as UploadStreamDescriptorWithPathType;
    const mockExpectedValue = {
      url: 'https://test.com/mock-bucket/uuid/test.json',
      key: 'import-product/test.json'
    };
    const extension = '.json';
    const fileName = dataMock.name.replace(/\.[^/.]+$/, '');
    const destinationMock = `${dataMock.path}/${fileName}${extension}`;
    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);

    const result = await cloudStorageService.uploadStream(dataMock, Buffer.from('test'));

    //Assertions
    expect(result).toEqual(mockExpectedValue);
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(destinationMock);
    expect(cloudStorageService.bucket_.file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().publicUrl).toHaveBeenCalled();
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
      key: 'import-product/test.json'
    };
    const extension = '.json';
    const fileName = dataMock.name.replace(/\.[^/.]+$/, '');
    const destinationMock = `${dataMock.path}/${fileName}${extension}`;
    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);

    const result = await cloudStorageService.uploadStream(dataMock, Buffer.from('test'));

    //Assertions
    expect(result).toEqual({
      ...mockExpectedValue,
      url: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
    });
    expect(cloudStorageService.bucket_.file).toHaveBeenCalledWith(destinationMock);
    expect(cloudStorageService.bucket_.file().createWriteStream).toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().publicUrl).not.toHaveBeenCalled();
  });

  test('should throw an error when upload with stream data empty extension (public)', async () => {
    const dataMock = {
      path: 'import-product',
      name: 'test'
    } as UploadStreamDescriptorWithPathType;
    const mockExpectedValue = {
      url: 'https://test.com/mock-bucket/uuid/test.json',
      key: 'import-product/test.json'
    };
    const extension = '.json';
    const fileName = dataMock.name.replace(/\.[^/.]+$/, '');
    const destinationMock = `${dataMock.path}/${fileName}${extension}`;
    // Mock the bucket and file objects
    const mockObjFile = {
      createWriteStream: jest.fn().mockReturnValue(new PassThrough()),
      publicUrl: jest.fn().mockResolvedValue(mockExpectedValue.url),
      cloudStorageURI: {
        href: `gs://${rootBucketName}/${dataMock.path}/${dataMock.name}`
      }
    };
    cloudStorageService.bucket_.file = jest.fn().mockReturnValue(mockObjFile);

    //Assertions
    await expect(cloudStorageService.uploadStream(dataMock, Buffer.from('test'))).rejects.toThrow(
      'File name must have extension.'
    );
    expect(cloudStorageService.bucket_.file).not.toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().createWriteStream).not.toHaveBeenCalled();
    expect(cloudStorageService.bucket_.file().publicUrl).not.toHaveBeenCalled();
  });
});
