//
// Copyright 2021 DXOS.org
//

import randomAccessChrome from '@dxos/random-access-chrome-file';

import { RandomAccessAbstract } from '../random-access-abstract';

const requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
const persistentStorage = navigator.persistentStorage || navigator.webkitPersistentStorage;

const DEFAULT_MAX_SIZE = Number.MAX_SAFE_INTEGER;

const requestQuota = async (n) => {
  return new Promise((resolve, reject) => {
    persistentStorage.queryUsageAndQuota((used, quota) => {
      if (quota) {
        return resolve(quota);
      }
      persistentStorage.requestQuota(n, (quota) => {
        resolve(quota);
      }, reject);
    }, reject);
  });
};

async function removeEntry (entry) {
  return new Promise((resolve, reject) => entry.remove(resolve, reject));
}

async function removeDirectory (directory) {
  const dirReader = directory.createReader();

  const entries = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));

  await Promise.all(entries.map(entry => {
    if (entry.isFile) {
      return removeEntry(entry);
    }

    return removeDirectory(entry);
  }));

  await removeEntry(directory);
}

/**
 * Chrome-specific storage.
 * To inspect storage: Dev tools > Application > Local Storage.
 * https://github.com/random-access-storage/random-access-chrome-file
 */
export class Chrome extends RandomAccessAbstract {
  constructor (root) {
    super(root);

    this._fs = null;
  }

  async getFS () {
    if (this._fs) {
      return this._fs;
    }

    const granted = await requestQuota(DEFAULT_MAX_SIZE, false);

    this._fs = await new Promise((resolve, reject) => {
      requestFileSystem(window.PERSISTENT, granted, (fs) => {
        resolve(fs);
      }, reject);
    });

    return this._fs;
  }

  async getDirectory () {
    const fs = await this.getFS();
    return new Promise((resolve, reject) => fs.root.getDirectory(this._root, { create: false }, resolve, reject));
  }

  _create (filename, opts = {}) {
    return randomAccessChrome(`${this._root}/${filename}`, opts);
  }

  async _destroy () {
    try {
      const dir = await this.getDirectory();
      await removeDirectory(dir);
    } catch (e) {
      // Code 8 == 'A requested file or directory could not be found at the time an operation was processed.'
      if (e.code !== 8) {
        throw e;
      }
    }
  }
}
