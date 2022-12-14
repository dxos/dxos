//
// Copyright 2022 DXOS.org
//

import { File } from './File';
import { JSFile } from './JSFile';
import { MDFile } from './MDFile';
import { TSFile } from './TSFile';

export const fileTypes: {
  [extension: string]: new (...args: any[]) => any;
} = {
  '.md': MDFile,
  '.ts': TSFile,
  '.tsx': TSFile,
  '.js': JSFile,
  '.jsx': JSFile
};

export const getFileType = (path: string) => {
  for (const key in fileTypes) {
    if (new RegExp(`${key.replace('.', '\\.')}$`).test(path)) {
      return fileTypes[key];
    }
  }
  return File;
};
