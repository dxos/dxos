//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

import { Table } from '../util';

export const PartyInfo: FC<{
  party: Party
}> = ({
  party
}) => {
  return (
    <Table
      columns={[
        {
          key: 'property',
          color: 'blue',
          width: 20
        },
        {
          key: 'value'
        }
      ]}
      rows={[
        {
          property: 'Name',
          value: party.getProperty('title')
        },
        {
          property: 'Public key',
          value: truncateKey(party.key, 4)
        }
      ]}
    />
  );
};
