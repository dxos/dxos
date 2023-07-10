//
// Copyright 2020 DXOS.org
//

import { Rows } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';
import { TableColumn } from '@dxos/mosaic';
import { SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { BitfieldDisplay, MasterTable, PublicKeySelector } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../hooks';

const columns: TableColumn<SubscribeToFeedBlocksResponse.Block>[] = [
  {
    Header: 'FeedKey',
    width: 120,
    accessor: (block) => {
      const feedKey = block.feedKey;
      return `${feedKey.truncate()} (${humanize(feedKey)})`;
    },
  },
  {
    Header: 'Sequence',
    width: 120,
    accessor: 'seq',
  },
];

const FeedsPanel = () => {
  const setContext = useDevtoolsDispatch();
  const { space, feedKey } = useDevtoolsState();
  const feedKeys = [
    ...(space?.internal.data.pipeline?.controlFeeds ?? []),
    ...(space?.internal.data.pipeline?.dataFeeds ?? []),
  ];
  const devtoolsHost = useDevtools();
  const [refreshCount, setRefreshCount] = useState(0);

  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys }), {}, [refreshCount]);

  const messages = useFeedMessages({ feedKey });

  const handleSelect = (feedKey?: PublicKey) => {
    setContext((state) => ({ ...state, feedKey }));
  };

  const refresh = () => {
    setRefreshCount(refreshCount + 1);
  };

  const getLabel = (key: PublicKey) => {
    const type = space?.internal.data.pipeline?.controlFeeds?.includes(key) ? 'control' : 'data';

    const meta = feeds.find((feed) => feed.feedKey.equals(key));

    if (meta) {
      return `${type} (${meta.length})`;
    } else {
      return type;
    }
  };

  const meta = feeds.find((feed) => feedKey && feed.feedKey.equals(feedKey));

  return (
    <div className='flex flex-col overflow-hidden'>
      <SpaceToolbar>
        <div className='flex w-[400px] flex-row space-x-4'>
          <PublicKeySelector
            keys={feedKeys}
            Icon={Rows}
            defaultValue={feedKey}
            placeholder={'Select feed'}
            getLabel={getLabel}
            onChange={handleSelect}
          />

          <Button onClick={refresh}>Refresh</Button>
        </div>
      </SpaceToolbar>
      <BitfieldDisplay value={meta?.downloaded ?? new Uint8Array()} length={meta?.length ?? 0} />
      <div className='flex flex-1 overflow-hidden'>
        <MasterTable<SubscribeToFeedBlocksResponse.Block> columns={columns} data={messages} />
      </div>
    </div>
  );
};

export default FeedsPanel;
