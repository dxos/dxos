//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { useDevtools } from '@dxos/react-client';

import { Table } from '../util';

export const PartyFeeds: FC<{
  partyKey: PublicKey;
}> = ({ partyKey }) => {
  return null;
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const { feeds = [] } = {}; // useStream(() => devtoolsHost.subscribeToFeeds({ party_key }), {});

  return (
    <Table
      showHeader
      columns={[
        {
          key: 'feedKey',
          value: (key) => truncateKey(key, 4),
          width: 20,
          color: 'green',
          label: 'feed'
        },
        {
          key: 'length',
          label: 'blocks'
        }
      ]}
      rows={feeds}
    />
  );
};
