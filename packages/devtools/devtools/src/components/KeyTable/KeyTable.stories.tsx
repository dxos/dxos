//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/protocols';
import { FullScreen } from '@dxos/react-components';

import { KeyRecord, KeyType } from '../../proto/gen/dxos/halo/keys';
import { KeyTable } from './KeyTable';

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
