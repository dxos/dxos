//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button, Toolbar } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { TableColumn } from '@dxos/mosaic';
import { SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { BitfieldDisplay, MasterDetailTable, PanelContainer, PublicKeySelector } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../hooks';
import { textLink } from '../../styles';

const columns: TableColumn<SubscribeToFeedBlocksResponse.Block>[] = [
  {
    Header: 'FeedKey',
    width: 80,
    Cell: ({ value }: any) => <div className={mx('font-mono', textLink)}>{value.truncate()}</div>,
    accessor: 'feedKey',
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
  const { feeds } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys }), {}, [refreshCount]);

  const messages = useFeedMessages({ feedKey }).reverse();
  const meta = feeds?.find((feed) => feedKey && feed.feedKey.equals(feedKey));

  // Hack to select and refresh first feed.
  const key = feedKey ?? feedKeys[0];
  useEffect(() => {
    if (key && !feedKey) {
      handleSelect(key);
      setTimeout(() => {
        handleRefresh();
      });
    }
  }, [key]);

  useEffect(() => {
    if (feedKey && feedKeys.length > 0 && !feedKeys.find((feed) => feed.equals(feedKey))) {
      handleSelect(feedKeys[0]);
    }
  }, [JSON.stringify(feedKeys), feedKey]);

  const handleSelect = (feedKey?: PublicKey) => {
    setContext((state) => ({ ...state, feedKey }));
  };

  const handleRefresh = () => {
    setRefreshCount(refreshCount + 1);
  };

  const getLabel = (key: PublicKey) => {
    const type = space?.internal.data.pipeline?.controlFeeds?.includes(key) ? 'control' : 'data';
    const meta = feeds?.find((feed) => feed.feedKey.equals(key));
    if (meta) {
      return `${type} (${meta.length})`;
    } else {
      return type;
    }
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <SpaceSelector />
          <PublicKeySelector
            placeholder='Select feed'
            getLabel={getLabel}
            keys={feedKeys}
            value={key}
            onChange={handleSelect}
          />

          <Button onClick={handleRefresh}>Refresh</Button>
        </Toolbar>
      }
    >
      <BitfieldDisplay value={meta?.downloaded ?? new Uint8Array()} length={meta?.length ?? 0} />
      <MasterDetailTable<SubscribeToFeedBlocksResponse.Block> columns={columns} data={messages} />
    </PanelContainer>
  );
};

export default FeedsPanel;
