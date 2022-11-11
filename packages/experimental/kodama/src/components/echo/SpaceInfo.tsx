//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

import { Table } from '../util';

export const SpaceInfo: FC<{
  space: Space;
}> = ({ space }) => {
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
          value: space.getProperty('title')
        },
        {
          property: 'Public key',
          value: truncateKey(space.key, 4)
        }
      ]}
    />
  );
};
