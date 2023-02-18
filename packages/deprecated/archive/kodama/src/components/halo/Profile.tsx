//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { truncateKey } from '@dxos/debug';
import { useIdentity } from '@dxos/react-client';

import { Table } from '../util';

export const Profile = () => {
  const profile = useIdentity();
  if (!profile) {
    return null;
  }

  return (
    <Table
      columns={[
        {
          key: 'property',
          color: 'blue',
          width: 16
        },
        {
          key: 'value'
        }
      ]}
      rows={[
        {
          property: 'Identity key',
          value: truncateKey(profile.identityKey, 4)
        },
        {
          property: 'Display name',
          value: profile.displayName
        }
      ]}
    />
  );
};
