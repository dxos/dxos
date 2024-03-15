//
// Copyright 2021 DXOS.org
//

import idb from 'random-access-idb';

import { invariant } from '@dxos/invariant';

import { BrowserStorage } from './browser-storage';
import { StorageType, getFullPath, wrapFile } from '../common';

/**
 * Storage interface implementation for index DB.
 * https://github.com/random-access-storage/random-access-idb
 */
export class IDbStorage extends BrowserStorage {
  public override type: StorageType = StorageType.IDB;
  private _db!: Promise<IDBDatabase>;
  private readonly _store = 'data';
  private _initialized = false;

  protected override _createFileStorage(path: string) {
    // Note: We use patched version of random-access-idb here that exposes the getdb method.
    const database = idb(path);
    let res: (db: IDBDatabase) => void;
    this._db = new Promise((resolve) => {
      res = resolve;
    });

    database.getdb(res!);
    return database.create;
  }

  async _loadFiles(path: string): Promise<void> {
    const db = await this._db;
    invariant(db, 'Database is not initialized.');
    const lowerBound = path;
    const upperBound = `${path}\uffff`;
    const range = IDBKeyRange.bound(lowerBound, upperBound);

    const transaction = db.transaction(this._store);
    const objectStore = transaction.objectStore(this._store);
    const request = objectStore.openCursor(range);

    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          // NOTE: The key contains some metadata at the end added by random-access-idb, so we need to split it.
          const filename = String(cursor.key).split('\0')[0];
          if (filename && !this._files.has(getFullPath(this.path, filename))) {
            const file = this._createFile(path, filename);
            this._files.set(getFullPath(this.path, filename), wrapFile(file, this.type));
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  protected override async _getFiles(path: string) {
    if (!this._initialized) {
      await this._loadFiles(this.path);
      this._initialized = true;
    }

    return super._getFiles(path);
  }
}
