//
// Copyright 2023 DXOS.org
//

import { InvalidConfigError } from '@dxos/protocols';
import { type Runtime_Client_Storage, Runtime_Client_Storage_StorageDriver } from '@dxos/protocols/buf/dxos/config_pb';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { getRootPath } from './util';

// TODO(burdon): Factor out.
export const createStorageObjects = (config: Runtime_Client_Storage) => {
  const { persistent = false, keyStore, dataStore } = config ?? {};
  if (persistent && dataStore === Runtime_Client_Storage_StorageDriver.RAM) {
    throw new InvalidConfigError({ message: 'RAM storage cannot be used in persistent mode.' });
  }
  if (!persistent && dataStore !== undefined && dataStore !== Runtime_Client_Storage_StorageDriver.RAM) {
    throw new InvalidConfigError({ message: 'Cannot use a persistent storage in not persistent mode.' });
  }
  if (persistent && keyStore === Runtime_Client_Storage_StorageDriver.RAM) {
    throw new InvalidConfigError({ message: 'RAM key storage cannot be used in persistent mode.' });
  }
  if (!persistent && keyStore !== Runtime_Client_Storage_StorageDriver.RAM && keyStore !== undefined) {
    throw new InvalidConfigError({ message: 'Cannot use a persistent key storage in not persistent mode.' });
  }

  return {
    storage: createStorage({
      type: persistent ? toStorageType(dataStore) : StorageType.RAM,
      root: getRootPath(config),
    }),
  };
};

const toStorageType = (type: Runtime_Client_Storage_StorageDriver | undefined): StorageType | undefined => {
  switch (type) {
    case undefined:
      return undefined;
    case Runtime_Client_Storage_StorageDriver.RAM:
      return StorageType.RAM;
    case Runtime_Client_Storage_StorageDriver.CHROME:
      return StorageType.CHROME;
    case Runtime_Client_Storage_StorageDriver.FIREFOX:
      return StorageType.FIREFOX;
    case Runtime_Client_Storage_StorageDriver.IDB:
      return StorageType.IDB;
    case Runtime_Client_Storage_StorageDriver.NODE:
      return StorageType.NODE;
    case Runtime_Client_Storage_StorageDriver.WEBFS:
      return StorageType.WEBFS;
    default:
      throw new Error(`Invalid storage type: ${Runtime_Client_Storage_StorageDriver[type]}`);
  }
};
