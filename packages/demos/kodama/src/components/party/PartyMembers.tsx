//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { useMembers } from '@dxos/react-client';

import { Table } from '../util';

export const PartyMembers: FC<{
  party: Party
}> = ({
  party
}) => {
  const members = useMembers(party);

  return (
    <Table
      showHeader
      columns={[
        {
          key: 'publicKey',
          value: key => truncateKey(key, 8),
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
