//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { useMembers, useSpace } from '@dxos/react-client';

import { Table } from '../util';

export const SpaceMembers: FC<{
  spaceKey: PublicKey;
}> = ({ spaceKey }) => {
  const _space = useSpace(spaceKey);
  const members = useMembers(spaceKey);

  return (
    <Table
      showHeader
      columns={[
        {
          key: 'identity_key',
          value: (key) => truncateKey(key, 4),
          width: 20,
          color: 'green',
          label: 'key'
        },
        {
          key: 'display_name',
          label: 'displayName'
        }
      ]}
      rows={members}
    />
  );
};
