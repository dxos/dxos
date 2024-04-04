//
// Copyright 2024 DXOS.org
//

import { DX_DATA } from '@dxos/client-protocol';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { isNode } from '@dxos/util';

export const getRootPath = (config: Runtime.Client.Storage) => {
  const { dataRoot = isNode() ? DX_DATA : 'dxos/storage' } = config ?? {};
  return `${dataRoot}/`;
};

export const isPersistent = (config: Runtime.Client.Storage) => {
  const { persistent = false } = config ?? {};
  return (
    (config.dataStore !== undefined && config.dataStore !== Runtime.Client.Storage.StorageDriver.RAM) || persistent
  );
};
