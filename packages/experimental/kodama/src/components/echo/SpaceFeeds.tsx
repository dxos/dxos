//
// Copyright 2022 DXOS.org
//

import React, { type FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';
import { useDevtools } from '@dxos/react-client/devtools';

import { Table } from '../util';

export const SpaceFeeds: FC<{
  spaceKey: PublicKey;
}> = ({ spaceKey }) => {
  return null;
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const { feeds = [] } = {}; // useStream(() => devtoolsHost.subscribeToFeeds({ space_key }), {});

  return (
    <Table
      showHeader
      columns={[
        {
          key: 'feedKey',
          value: (key) => truncateKey(key),
          width: 20,
          color: 'green',
          label: 'feed',
        },
        {
          key: 'length',
          label: 'blocks',
        },
      ]}
      rows={feeds}
    />
  );
};
