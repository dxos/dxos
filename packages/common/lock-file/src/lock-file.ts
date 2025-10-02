//
// Copyright 2023 DXOS.org
//

import { existsSync } from 'node:fs';
import { type FileHandle, constants, open } from 'node:fs/promises';

import { LockfileSys } from './sys';

const sys = new LockfileSys();

export class LockFile {
  static async acquire(filename: string): Promise<FileHandle> {
    await sys.init();

    const handle = await open(filename, constants.O_CREAT | constants.O_RDWR);

    try {
      // Try to acquire exclusive non-blocking lock
      sys.flock(handle.fd, 'exnb');
      return handle;
    } catch (err) {
      // Close the file handle if we can't acquire the lock
      await handle.close();
      throw err;
    }
  }

  static async release(handle: FileHandle): Promise<void> {
    try {
      // Release the lock
      sys.flock(handle.fd, 'un');
    } finally {
      await handle.close();
    }
  }

  static async isLocked(filename: string): Promise<boolean> {
    if (!existsSync(filename)) {
      return false;
    }
    try {
      const handle = await LockFile.acquire(filename);
      await LockFile.release(handle);
      return false;
    } catch (e) {
      return true;
    }
  }
}
