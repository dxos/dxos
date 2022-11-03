//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';

import { Table } from '../util';

export const PartyFeeds: FC<{
  spaceKey: PublicKey;
}> = ({ spaceKey }) => {
  return null;
  // TODO(dmaretskyi): Not working currently.
  // const devtoolsHost = useDevtools();
  const { feeds = [] } = {}; // useStream(() => devtoolsHost.subscribeToFeeds({ space_key }), {});

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
