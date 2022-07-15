//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { useDevtools, useStream } from '@dxos/react-client';

import { Table } from '../util';

export const PartyFeeds: FC<{
  party: Party
}> = ({
  party
}) => {
  const devtoolsHost = useDevtools();
  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ partyKey: party.key }), {});

  return (
    <Table
      showHeader
      columns={[
        {
          key: 'feedKey',
          value: key => truncateKey(key, 4),
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
