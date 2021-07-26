//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { STORAGE_NODE, STORAGE_CHROME, STORAGE_FIREFOX, STORAGE_IDB } from './storage-types';

const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
const isBrowser = typeof window !== 'undefined';

const defaultStorageType = () => {
  if (isNode) {
    return STORAGE_NODE;
  }

  if (isBrowser) {
    if ((window as any).requestFileSystem || (window as any).webkitRequestFileSystem) {
      return STORAGE_CHROME;
    }

    if ((window as any).IDBMutableFile) {
      return STORAGE_FIREFOX;
    }

    return STORAGE_IDB;
  }

  throw new Error('Unknown platform.');
};

/**
 * Returns a factory for creating random-access storage functions.
 *
 * @typedef {Function} StorageFactory
 * @property {string} root
 * @property {string} type
 * @property {Function} destroy
 *
 * @param {Object} storageTypes
 * @returns {StorageFactory}
 */
export const createStorageFactory = (storageTypes: any) => (root: string, type = defaultStorageType()) => {
  assert(storageTypes[type], `Invalid type: ${type}`);

  /** @type {RandomAccessAbstract} */
  const storage = new storageTypes[type](root);

  function factory (file: string, opts = {}) {
    return storage.create(file, opts);
  }

  factory._storage = storage;

  factory.root = root;
  factory.type = type;
  factory.destroy = () => storage.destroy();

  return factory;
};
