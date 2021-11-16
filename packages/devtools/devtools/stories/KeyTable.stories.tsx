//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/crypto';

import { KeyTable } from '../src';
import { KeyRecord, KeyType } from '../src/proto/gen/dxos/halo/keys';

export default {
  title: 'devtools/KeyTable'
};

export const Primary = () => {
  const keys: KeyRecord[] = [...new Array(5)].map(() => ({
    type: KeyType.FEED,
    publicKey: PublicKey.random(),
    added: new Date().toUTCString(),
    own: Boolean(Math.random() > 0.3),
    trusted: Boolean(Math.random() > 0.5)
  }));

  return (
    <KeyTable
      keys={keys}
    />
  )
}
