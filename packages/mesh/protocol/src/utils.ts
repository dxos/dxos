//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { HumanHasher } from '@dxos/crypto';

const hasher = new HumanHasher();

export const keyToHuman = (key: Buffer, prefix?: string) => {
  assert(Buffer.isBuffer(key));

  const name = hasher.humanize(key.toString('hex'));
  if (prefix) {
    return `${prefix}(${name})`;
  }

  return name;
};
