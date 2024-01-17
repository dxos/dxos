//
// Copyright 2021 DXOS.org
//

import del from 'del';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import raf from 'random-access-file';
import { type RandomAccessStorage } from 'random-access-storage';

import { AbstractStorage, type DiskInfo, type Storage, StorageType, wrapFile, type File } from '../common';

/**
 * Storage interface implementation for Node.
 */
export class NodeStorage extends AbstractStorage implements Storage {
  public override type: StorageType = StorageType.NODE;
  private _initialized = false;

  private _loadFiles(path: string) {
    // TODO(mykola): Do not load all files at once. It is a quick fix.
    if (!existsSync(path)) {
      return;
    }

    // Preload all files in a directory.
    const dir = readdirSync(path);
    for (const entry of dir) {
      const fullPath = join(path, entry);
      if (this._files.has(fullPath)) {
        continue;
      }
      const entryInfo = statSync(fullPath);
      if (entryInfo.isDirectory()) {
        this._loadFiles(fullPath);
      } else if (entryInfo.isFile()) {
        const file = this._createFile(path, entry);
        this._files.set(fullPath, wrapFile(file, this.type));
      }
    }
  }

  protected override _createFile(path: string, filename: string, opts: any = {}): RandomAccessStorage {
    const file = raf(filename, { directory: path, ...opts });

    // Empty write to create file on a drive.
    file.write(0, Buffer.from(''));

    return file;
  }

  protected override async _destroy() {
    await del(this.path, { force: true });
  }

  protected override _getFiles(path: string): Map<string, File> {
    if (!this._initialized) {
      this._loadFiles(this.path);
      this._initialized = true;
    }

    return super._getFiles(path);
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
