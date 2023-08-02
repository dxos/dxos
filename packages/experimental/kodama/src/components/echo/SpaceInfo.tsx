//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { Space } from '@dxos/react-client/echo';

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
          width: 20,
        },
        {
          key: 'value',
        },
      ]}
      rows={[
        {
          property: 'Name',
          value: space.properties.name,
        },
        {
          property: 'Public key',
          value: truncateKey(space.key),
        },
      ]}
    />
  );
};
