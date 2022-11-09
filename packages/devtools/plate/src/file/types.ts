import { MDFile } from './MDFile';
import { File } from './File';

export const fileTypes: {
  [extension: string]: new (...args: any[]) => any;
} = {
  '.md': MDFile
};

export const getFileType = (path: string) => {
  for (let key in fileTypes) {
    if (new RegExp(`${key.replace('.', '\\.')}$`).test(path)) {
      return fileTypes[key];
    }
  }
  return File;
};
