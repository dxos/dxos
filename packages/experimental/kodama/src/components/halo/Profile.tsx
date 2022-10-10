//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { truncateKey } from '@dxos/debug';
import { useProfile } from '@dxos/react-client';

import { Table } from '../util/index.js';

export const Profile = () => {
  const profile = useProfile();
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
          property: 'Public key',
          value: truncateKey(profile.publicKey, 4)
        },
        {
          property: 'Username',
          value: profile.username
        }
      ]}
    />
  );
};
