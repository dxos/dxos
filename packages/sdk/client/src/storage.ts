//
// Copyright 2021 DXOS.org
//

import jsondown from 'jsondown';
import leveljs from 'level-js';
import memdown from 'memdown';

import { defs } from '@dxos/config';
import { createStorage } from '@dxos/random-access-multi-storage';

import { InvalidConfigurationError } from './errors';
import { isNode } from './platform';

export type StorageType = 'ram' | 'idb' | 'chrome' | 'firefox' | 'node';
export type KeyStorageType = 'ram' | 'leveljs' | 'jsondown';

// TODO(burdon): Factor out.
export const createStorageObjects = (config: defs.System.Storage, snapshotsEnabled = false) => {
  const {
    path = 'dxos/storage', // TODO(burdon): Factor out const.
    storageType,
    keyStorage,
    persistent = false
  } = config ?? {};

  if (persistent && storageType === defs.System.Storage.StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM storage cannot be used in persistent mode.');
  }
  if (!persistent && (storageType !== undefined && storageType !== defs.System.Storage.StorageDriver.RAM)) {
    throw new InvalidConfigurationError('Cannot use a persistent storage in not persistent mode.');
  }
  if (persistent && keyStorage === defs.System.Storage.StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM key storage cannot be used in persistent mode.');
  }
  if (!persistent && (keyStorage !== defs.System.Storage.StorageDriver.RAM && keyStorage !== undefined)) {
    throw new InvalidConfigurationError('Cannot use a persistent key storage in not persistent mode.');
  }

  return {
    feedStorage: createStorage(`${path}/feeds`, persistent ? toStorageType(storageType) : 'ram'),
    keyStorage: createKeyStorage(`${path}/keystore`, persistent ? toKeyStorageType(keyStorage) : 'ram'),
    snapshotStorage: createStorage(`${path}/snapshots`, persistent && snapshotsEnabled ? toStorageType(storageType) : 'ram'),
    metadataStorage: createStorage(`${path}/metadata`, persistent ? toStorageType(storageType) : 'ram')
  };
};

// TODO(burdon): Factor out.
const createKeyStorage = (path: string, type?: KeyStorageType) => {
  const defaultedType = type ?? (isNode() ? 'jsondown' : 'leveljs');

  switch (defaultedType) {
    case 'leveljs':
      return leveljs(path);
    case 'jsondown':
      return jsondown(path);
    case 'ram':
      return memdown();
    default:
      throw new InvalidConfigurationError(`Invalid key storage type: ${defaultedType}`);
  }
};

const toStorageType = (type: defs.System.Storage.StorageDriver | undefined): StorageType | undefined => {
  switch (type) {
    case undefined: return undefined;
    case defs.System.Storage.StorageDriver.RAM: return 'ram';
    case defs.System.Storage.StorageDriver.CHROME: return 'chrome';
    case defs.System.Storage.StorageDriver.FIREFOX: return 'firefox';
    case defs.System.Storage.StorageDriver.IDB: return 'idb';
    case defs.System.Storage.StorageDriver.NODE: return 'node';
    default: throw new Error(`Invalid storage type: ${defs.System.Storage.StorageDriver[type]}`);
  }
};

const toKeyStorageType = (type: defs.System.Storage.StorageDriver | undefined): KeyStorageType | undefined => {
  switch (type) {
    case undefined: return undefined;
    case defs.System.Storage.StorageDriver.RAM: return 'ram';
    case defs.System.Storage.StorageDriver.LEVELJS: return 'leveljs';
    case defs.System.Storage.StorageDriver.JSONDOWN: return 'jsondown';
    default: throw new Error(`Invalid key storage type: ${defs.System.Storage.StorageDriver[type]}`);
  }
};
