//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { humanize } from '@dxos/util';

export const keyToHuman = (key: Buffer, prefix?: string) => {
  assert(Buffer.isBuffer(key));

  const name = humanize(key.toString('hex'));
  if (prefix) {
    return `${prefix}(${name})`;
  }

  return name;
};
