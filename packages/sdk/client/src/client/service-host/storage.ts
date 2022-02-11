//
// Copyright 2021 DXOS.org
//

import jsondown from 'jsondown';
import leveljs from 'level-js';
import memdown from 'memdown';

import { defs } from '@dxos/config';
import { createStorage } from '@dxos/random-access-multi-storage';

import { InvalidConfigurationError } from '../../interfaces';
import { isNode } from '../../util';

export type StorageType = 'ram' | 'idb' | 'chrome' | 'firefox' | 'node';
export type KeyStorageType = 'ram' | 'leveljs' | 'jsondown';

import StorageDriver = defs.Runtime.Client.Storage.StorageDriver;

// TODO(burdon): Factor out.
export const createStorageObjects = (config: defs.Runtime.Client.Storage, snapshotsEnabled = false) => {
  const {
    path = 'dxos/storage', // TODO(burdon): Factor out const.
    storageType,
    keyStorage,
    persistent = false
  } = config ?? {};

  if (persistent && storageType === StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM storage cannot be used in persistent mode.');
  }
  if (!persistent && (storageType !== undefined && storageType !== StorageDriver.RAM)) {
    throw new InvalidConfigurationError('Cannot use a persistent storage in not persistent mode.');
  }
  if (persistent && keyStorage === StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM key storage cannot be used in persistent mode.');
  }
  if (!persistent && (keyStorage !== StorageDriver.RAM && keyStorage !== undefined)) {
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

const toStorageType = (type: StorageDriver | undefined): StorageType | undefined => {
  switch (type) {
    case undefined: return undefined;
    case StorageDriver.RAM: return 'ram';
    case StorageDriver.CHROME: return 'chrome';
    case StorageDriver.FIREFOX: return 'firefox';
    case StorageDriver.IDB: return 'idb';
    case StorageDriver.NODE: return 'node';
    default: throw new Error(`Invalid storage type: ${StorageDriver[type]}`);
  }
};

const toKeyStorageType = (type: StorageDriver | undefined): KeyStorageType | undefined => {
  switch (type) {
    case undefined: return undefined;
    case StorageDriver.RAM: return 'ram';
    case StorageDriver.LEVELJS: return 'leveljs';
    case StorageDriver.JSONDOWN: return 'jsondown';
    default: throw new Error(`Invalid key storage type: ${StorageDriver[type]}`);
  }
};
