//
// Copyright 2024 DXOS.org
//

import path from 'node:path';

import { PublicKey } from '@dxos/keys';
import { createLevel as createKV } from '@dxos/kv-store';
import { type Runtime_Client_Storage } from '@dxos/protocols/buf/dxos/config_pb';

import { getRootPath, isPersistent } from './util';

export const createLevel = async (config: Runtime_Client_Storage) => {
  const persistent = isPersistent(config);
  const storagePath = persistent ? path.join(getRootPath(config), 'level') : `/tmp/dxos-${PublicKey.random().toHex()}`;
  const level = createKV(storagePath);
  // TODO(dmaretskyi): This function shouldn't call open - .
  await level.open();
  return level;
};
