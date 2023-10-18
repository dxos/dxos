//
// Copyright 2021 DXOS.org
//

import del from 'del';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import raf from 'random-access-file';
import { type RandomAccessStorage } from 'random-access-storage';

import { AbstractStorage, type DiskInfo, type Storage, StorageType } from '../common';

/**
 * Storage interface implementation for Node.
 */
export class NodeStorage extends AbstractStorage implements Storage {
  public override type: StorageType = StorageType.NODE;

  protected override _createFile(path: string, filename: string, opts: any = {}): RandomAccessStorage {
    const file = raf(filename, { directory: path, ...opts });

    // Empty write to create file on a drive.
    file.write(0, Buffer.from(''));

    return file;
  }

  protected override async _destroy() {
    await del(this.path, { force: true });
  }

  async getDiskInfo(): Promise<DiskInfo> {
    let used = 0;

    const recurse = async (path: string) => {
      const pathStats = await stat(path);

      used += pathStats.size;

      if (pathStats.isDirectory()) {
        const entries = await readdir(path);
        await Promise.all(entries.map((entry) => recurse(join(path, entry))));
      }
    };

    await recurse(this.path);

    return {
      used,
    };
  }
}
