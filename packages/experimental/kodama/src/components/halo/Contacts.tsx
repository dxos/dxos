//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { truncateKey } from '@dxos/debug';
import { useContacts } from '@dxos/react-client';

import { Table } from '../util/index.js';

export const Contacts = () => {
  const contacts = useContacts();

  return (
    <Table
      rows={contacts}
      columns={[
        {
          key: 'public_key',
          color: 'blue',
          value: key => truncateKey(key, 4)
        },
        {
          key: 'display_name'
        }
      ]}
    />
  );
};
