//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';
import { useDevtools, useStream } from '@dxos/react-client';

import { Table } from '../util';

export const PartyFeeds: FC<{
  partyKey: PublicKey
}> = ({
  partyKey
}) => {
  const devtoolsHost = useDevtools();
  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ partyKey }), {});

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
