//
// Copyright 2022 DXOS.org
//

import React, { type FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';
import { useMembers, useSpace } from '@dxos/react-client/echo';

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
          value: (key) => truncateKey(key),
          width: 20,
          color: 'green',
          label: 'key',
        },
        {
          key: 'display_name',
          label: 'displayName',
        },
      ]}
      rows={members}
    />
  );
};
