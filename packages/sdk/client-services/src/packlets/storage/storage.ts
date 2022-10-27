//
// Copyright 2021 DXOS.org
//

import jsondown from 'jsondown';
import leveljs from 'level-js';
import memdown from 'memdown';

import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { isNode } from '@dxos/util';

import StorageDriver = Runtime.Client.Storage.StorageDriver;
import { InvalidConfigurationError } from '../../errors';

export type KeyStorageType = 'ram' | 'leveljs' | 'jsondown';

// TODO(burdon): Factor out.
export const createStorageObjects = (config: Runtime.Client.Storage) => {
  const {
    path = 'dxos/storage', // TODO(burdon): Factor out const.
    storageType,
    keyStorage,
    persistent = false
  } = config ?? {};

  if (persistent && storageType === StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM storage cannot be used in persistent mode.');
  }
  if (!persistent && storageType !== undefined && storageType !== StorageDriver.RAM) {
    throw new InvalidConfigurationError('Cannot use a persistent storage in not persistent mode.');
  }
  if (persistent && keyStorage === StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM key storage cannot be used in persistent mode.');
  }
  if (!persistent && keyStorage !== StorageDriver.RAM && keyStorage !== undefined) {
    throw new InvalidConfigurationError('Cannot use a persistent key storage in not persistent mode.');
  }

  return {
    storage: createStorage({
      type: persistent ? toStorageType(storageType) : StorageType.RAM,
      root: `${path}/`
    }),
    keyStorage: createKeyStorage(`${path}/keystore`, persistent ? toKeyStorageType(keyStorage) : 'ram')
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
    case undefined:
      return undefined;
    case StorageDriver.RAM:
      return StorageType.RAM;
    case StorageDriver.CHROME:
      return StorageType.CHROME;
    case StorageDriver.FIREFOX:
      return StorageType.FIREFOX;
    case StorageDriver.IDB:
      return StorageType.IDB;
    case StorageDriver.NODE:
      return StorageType.NODE;
    default:
      throw new Error(`Invalid storage type: ${StorageDriver[type]}`);
  }
};

const toKeyStorageType = (type: StorageDriver | undefined): KeyStorageType | undefined => {
  switch (type) {
    case undefined:
      return undefined;
    case StorageDriver.RAM:
      return 'ram';
    case StorageDriver.LEVELJS:
      return 'leveljs';
    case StorageDriver.JSONDOWN:
      return 'jsondown';
    default:
      throw new Error(`Invalid key storage type: ${StorageDriver[type]}`);
  }
};
