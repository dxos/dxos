//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { useMembers, useSpace } from '@dxos/react-client';

import { Table } from '../util';

export const PartyMembers: FC<{
  partyKey: PublicKey;
}> = ({ partyKey }) => {
  const _party = useSpace(partyKey);
  const members = useMembers(partyKey);

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
