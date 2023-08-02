//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { truncateKey } from '@dxos/debug';
import { useIdentity } from '@dxos/react-client/halo';

import { Table } from '../util';

export const Identity = () => {
  const identity = useIdentity();
  if (!identity) {
    return null;
  }

  return (
    <Table
      columns={[
        {
          key: 'property',
          color: 'blue',
          width: 16,
        },
        {
          key: 'value',
        },
      ]}
      rows={[
        {
          property: 'Identity key',
          value: truncateKey(identity.identityKey),
        },
        {
          property: 'Display name',
          value: identity.profile,
        },
      ]}
    />
  );
};
