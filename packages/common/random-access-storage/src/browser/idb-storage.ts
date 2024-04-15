//
// Copyright 2021 DXOS.org
//

import idb from 'random-access-idb';
import { type RandomAccessStorage } from 'random-access-storage';

import { invariant } from '@dxos/invariant';

import { AbstractStorage, StorageType, getFullPath, wrapFile } from '../common';

const DELIM = '\0';
/**
 * Storage interface implementation for index DB.
 * https://github.com/random-access-storage/random-access-idb
 */
export class IDbStorage extends AbstractStorage {
  public override type: StorageType = StorageType.IDB;
  private _db!: Promise<IDBDatabase>;
  private readonly _store = 'data';
  private _initialized = false;
  protected readonly _fileStorage: (filename: string, opts?: {}) => RandomAccessStorage;

  constructor(path: string) {
    super(path);
    this._fileStorage = this._createFileStorage(path);
  }

  protected _createFileStorage(path: string): (filename: string, opts?: {}) => RandomAccessStorage {
    // Note: We use patched version of random-access-idb here that exposes the getdb method.
    const database = idb(path);
    let res: (db: IDBDatabase) => void;
    this._db = new Promise((resolve) => {
      res = resolve;
    });

    database.getdb(res!);
    return database.create;
  }

  override async close() {
    await this._closeFilesInPath('');
    (await this._db).close();
  }

  override async reset() {
    await this._closeFilesInPath('');
    await this._remove('');
    (await this._db).close();

    // eslint-disable-next-line no-undef
    return new Promise<void>((resolve, reject) => {
      // Declared here to capture the stack-trace.
      const errUpgradeNeeded = new Error('Upgrade needed.');
      const errBlocked = new Error('Blocked.');

      const request = indexedDB.deleteDatabase(this.path);
      request.onsuccess = () => {
        resolve();
      };
      request.onupgradeneeded = () => {
        reject(errUpgradeNeeded);
      };
      request.onblocked = () => {
        reject(errBlocked);
      };
      request.onerror = (err: any) => {
        reject(err);
      };
    });
  }

  protected override async _destroy() {
    throw new Error('Unreachable');
  }

  protected override _createFile(path: string, filename: string): RandomAccessStorage {
    const file = this._fileStorage(getFullPath(path, filename));
    file.destroy = (cb: (err: Error | null) => void) => {
      void this._db.then((db) => {
        const lowerBound = getFullPath(path, filename);
        const upperBound = `${lowerBound}\uffff`;
        const range = IDBKeyRange.bound(lowerBound, upperBound);

        const transaction = db.transaction(this._store, 'readwrite');
        const objectStore = transaction.objectStore(this._store);
        objectStore.delete(range);
        transaction.oncomplete = () => {
          (file as any).destroyed = true;
          (file as any).unlinked = true;
          (file as any).closed = true;
          cb(null);
        };
        transaction.onerror = () => cb(transaction.error);
      });
    };
    (file as any).deletable = true;

    return file;
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
          const filename = String(cursor.key).split(DELIM)[0];
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
