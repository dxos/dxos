//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { useMembers, useParty } from '@dxos/react-client';

import { Table } from '../util/index.js';

export const PartyMembers: FC<{
  partyKey: PublicKey
}> = ({
  partyKey
}) => {
  const party = useParty(partyKey);
  const members = useMembers(party);

  return (
    <Table
      showHeader
      columns={[
        {
          key: 'public_key',
          value: key => truncateKey(key, 4),
          width: 20,
          color: 'green',
          label: 'key'
        },
        {
          key: 'display_name',
          label: 'username'
        }
      ]}
      rows={members}
    />
  );
};
