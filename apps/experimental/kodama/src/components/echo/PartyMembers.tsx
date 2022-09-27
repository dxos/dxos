//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';
import { useMembers, useParty } from '@dxos/react-client';

import { Table } from '../util';

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
          key: 'publicKey',
          value: key => truncateKey(key, 4),
          width: 20,
          color: 'green',
          label: 'key'
        },
        {
          key: 'displayName',
          label: 'username'
        }
      ]}
      rows={members}
    />
  );
};
