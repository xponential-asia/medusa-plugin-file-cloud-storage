export type UploadStreamDescriptorWithPathType = {
  name: string;
  ext?: string;
  isPrivate?: boolean;
  path: string;
};

export type UploadedJsonType = {
  data: {
    [x: string]: unknown;
  };
  path: string;
  name: string;
  isPrivate?: boolean;
};
