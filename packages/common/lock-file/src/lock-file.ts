//
// Copyright 2023 DXOS.org
//

import { flock } from 'fs-ext';
import { constants, open, FileHandle } from 'node:fs/promises';

export class LockFile {
  static async acquire(filename: string): Promise<FileHandle> {
    const handle = await open(filename, constants.O_CREAT);
    await new Promise<void>((resolve, reject) => {
      flock(handle.fd, 'exnb', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    return handle;
  }

  static async release(handle: FileHandle): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      flock(handle.fd, 'un', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    await handle.close();
  }
}
