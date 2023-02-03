//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { PublicKey } from '@dxos/keys';
import { SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { humanize } from '@dxos/util';

import { MasterTable, PublicKeySelector } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../hooks';

const columns: Column<SubscribeToFeedBlocksResponse.Block>[] = [
  {
    Header: 'FeedKey',
    width: 120,
    accessor: (block) => {
      const feedKey = block.feedKey;
      return `${feedKey.truncate(4)} (${humanize(feedKey)})`;
    }
  },
  {
    Header: 'Sequence',
    width: 120,
    accessor: 'seq'
  }
];

const FeedsPanel = () => {
  const setContext = useDevtoolsDispatch();
  const { spaceInfo: metadata, feedKey } = useDevtoolsState();

  const [feeds, setFeeds] = useState<PublicKey[]>([]);
  useEffect(() => {
    if (!metadata) {
      return;
    }

    setFeeds([metadata.genesisFeed, metadata.controlFeed, metadata.dataFeed]);
  }, [metadata]);

  const messages = useFeedMessages({ feedKey });

  const handleSelect = (feedKey?: PublicKey) => {
    setContext((state) => ({ ...state, feedKey }));
  };

  return (
    <div className='flex flex-col overflow-hidden'>
      <SpaceToolbar>
        <div className='w-[400px]'>
          <PublicKeySelector keys={feeds} value={feedKey} placeholder={'Select feed'} onSelect={handleSelect} />
        </div>
      </SpaceToolbar>
      <div className='flex flex-1 overflow-hidden'>
        <MasterTable<SubscribeToFeedBlocksResponse.Block> columns={columns} data={messages} />
      </div>
    </div>
  );
};

export default FeedsPanel;
