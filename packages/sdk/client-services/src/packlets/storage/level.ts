//
// Copyright 2024 DXOS.org
//

import path from 'node:path';

import { PublicKey } from '@dxos/keys';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

import { getRootPath, isPersistent } from './util';

export const createLevel = async (config: Runtime.Client.Storage) => {
  // Imported here rather than at module scope so that this barrel, which the client pulls in on every
  // startup, does not bind `level`'s native addon — a compiled binary cannot carry one.
  const { createLevel: createKV } = await import('@dxos/kv-store/level');
  const persistent = isPersistent(config);
  const storagePath = persistent ? path.join(getRootPath(config), 'level') : `/tmp/dxos-${PublicKey.random().toHex()}`;
  const level = createKV(storagePath);
  // TODO(dmaretskyi): This function shouldn't call open - .
  await level.open();
  return level;
};
