//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { KeyRecord, KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { FullScreen } from '@dxos/react-components';

import { KeyTable } from './KeyTable.js';

export default {
  title: 'KeyTable'
};

export const Primary = () => {
  // TODO(burdon): Factor out.
  const keys: KeyRecord[] = [...new Array(20)].map(() => ({
    type: KeyType.FEED,
    publicKey: PublicKey.random(),
    added: new Date().toUTCString(),
    own: Boolean(Math.random() > 0.3),
    trusted: Boolean(Math.random() > 0.5)
  }));

  return (
    <FullScreen>
      <KeyTable
        keys={keys}
      />
    </FullScreen>
  );
};
