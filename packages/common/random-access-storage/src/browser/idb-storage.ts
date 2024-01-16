//
// Copyright 2021 DXOS.org
//

import idb from 'random-access-idb';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { BrowserStorage } from './browser-storage';
import { StorageType, wrapFile } from '../common';

const win = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : undefined;

/**
 * Storage interface implementation for index DB.
 * https://github.com/random-access-storage/random-access-idb
 */
export class IDbStorage extends BrowserStorage {
  public override type: StorageType = StorageType.IDB;
  private _initialized = false;

  private async _loadFiles(path: string) {
    if (!win) {
      return;
    }

    const trigger = new Trigger();
    // Preload all files in a directory.
    const requestDb = win.indexedDB.open(this.path);
    requestDb.onerror = () => {
      log.error('Error opening IDb');
      trigger.wake();
    };

    requestDb.onsuccess = () => {
      const db = requestDb.result;
      const requestKeys = db.transaction(['data'], 'readonly').objectStore('data').getAllKeys();
      requestKeys.onerror = (event) => {
        log.error('Error getting keys', { err: event.target });
        trigger.wake();
      };

      requestKeys.onsuccess = () => {
        const keys: string[] = requestKeys.result as any;
        console.log('keys', keys);
        for (const key of keys) {
          if (this._files.has(key)) {
            continue;
          }
          console.log('key', typeof key);

          const file = this._createFile(path, key);
          this._files.set(key, wrapFile(file, this.type));
        }
        trigger.wake();
      };
      db.close();
    };

    return trigger.wait();
  }

  protected override _createFileStorage(path: string) {
    return idb(path);
  }

  protected override async _getFiles(path: string) {
    if (!this._initialized) {
      await this._loadFiles(this.path);
      this._initialized = true;
    }

    return super._getFiles(path);
  }
}
