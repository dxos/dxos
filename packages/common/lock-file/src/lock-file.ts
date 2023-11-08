//
// Copyright 2023 DXOS.org
//

import { flock } from 'fs-ext';
import { existsSync } from 'node:fs';
import { open, type FileHandle, constants } from 'node:fs/promises';

export class LockFile {
  static async acquire(filename: string): Promise<FileHandle> {
    const handle = await open(filename, constants.O_CREAT);
    await new Promise<void>((resolve, reject) => {
      flock(handle.fd, 'exnb', async (err) => {
        if (err) {
          reject(err);
          await handle.close();
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

  static async isLocked(filename: string): Promise<boolean> {
    if (!existsSync(filename)) {
      return false;
    }
    try {
      const handle = await LockFile.acquire(filename);
      await LockFile.release(handle);
      await handle.close();

      return false;
    } catch (e) {
      return true;
    }
  }
}
