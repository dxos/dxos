//
// Copyright 2022 DXOS.org
//

import { File } from './File';
import { MDFile } from './MDFile';

export const fileTypes: {
  [extension: string]: new (...args: any[]) => any;
} = {
  '.md': MDFile
};

export const getFileType = (path: string) => {
  for (const key in fileTypes) {
    if (new RegExp(`${key.replace('.', '\\.')}$`).test(path)) {
      return fileTypes[key];
    }
  }
  return File;
};
