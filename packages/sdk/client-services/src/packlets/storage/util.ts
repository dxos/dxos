//
// Copyright 2024 DXOS.org
//

import { DX_DATA } from '@dxos/client-protocol';
import { type Runtime_Client_Storage, Runtime_Client_Storage_StorageDriver } from '@dxos/protocols/buf/dxos/config_pb';
import { isNode } from '@dxos/util';

export const getRootPath = (config: Runtime_Client_Storage) => {
  const { dataRoot = isNode() ? DX_DATA : 'dxos/storage' } = config ?? {};
  return `${dataRoot}/`;
};

export const isPersistent = (config: Runtime_Client_Storage) => {
  const { persistent = false } = config ?? {};
  return (
    (config.dataStore !== undefined && config.dataStore !== Runtime_Client_Storage_StorageDriver.RAM) || persistent
  );
};
