//
// Copyright 2024 DXOS.org
//

export type FileInfo = {};

export type FileManagerProvides = {
  file: {
    upload?: (file: FileInfo) => Promise<string | undefined>;
  };
};
