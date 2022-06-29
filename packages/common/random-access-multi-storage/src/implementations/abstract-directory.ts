//
// Copyright 2022 DXOS.org
//

import { File, Directory, Storage } from '../interfaces';
import { getFullPath } from '../utils';

export abstract class AbstractDirectory implements Directory {
  protected readonly _path: string;
  protected _files: Map<string, File>;
  protected readonly _storage: Storage;

  constructor (path: string, storage: Storage) {
    this._path = path;
    this._files = new Map<string, File>();
    this._storage = storage;
  }

  subDirectory (path: string): Directory {
    const fullPath = getFullPath(this._path, path);
    return this._storage.directory(fullPath);
  }

  public createOrOpen (filename: string, opts?: any): File {
    const file = this._create(filename, opts);
    this._files.set(filename, file);
    return file;
  }

  public _close (): Promise<void[]> {
    return Promise.all(
      Array.from(this._files.values())
        .map(file => file.close().catch((error: any) => console.error(error.message)))
    );
  }

  public _destroy (): Promise<void[]> {
    return Promise.all(
      Array.from(this._files.values())
        .map(file => file.destroy().catch((error: any) => console.error(error.message)))
    );
  }

  protected abstract _create (filename: string, opts?: any): File;
}
