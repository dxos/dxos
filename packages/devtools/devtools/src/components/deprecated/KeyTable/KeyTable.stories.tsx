//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { FullScreen } from '@dxos/react-components-deprecated';

import { KeyTable } from './KeyTable';

export default {
  title: 'KeyTable'
};

export const Primary = () => {
  // TODO(burdon): Factor out.
  const keys: KeyRecord[] = [...new Array(20)].map(() => ({
    publicKey: PublicKey.random().asUint8Array()
  }));

  return (
    <FullScreen>
      <KeyTable keys={keys} />
    </FullScreen>
  );
};
