//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import path from 'path';

// TODO: factor out to own fs package like @dxos/fs
export const exists = async (...args: string[]): Promise<boolean> => {
  try {
    const result = await fs.stat(path.join(...args));
    return !!result;
  } catch (err: any) {
    if (/ENOENT/.test(err.message)) {
      return false;
    } else {
      throw err;
    }
  }
};
