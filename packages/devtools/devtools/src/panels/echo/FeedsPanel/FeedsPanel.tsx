//
// Copyright 2020 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { type SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';
import { getSize } from '@dxos/react-ui-theme';

import { Bitbar, MasterDetailTable, PanelContainer, PublicKeySelector } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../../hooks';

const { helper, builder } = createColumnBuilder<SubscribeToFeedBlocksResponse.Block>();
const columns: TableColumnDef<SubscribeToFeedBlocksResponse.Block, any>[] = [
  helper.accessor('feedKey', builder.key({ header: 'key', tooltip: true })),
  helper.accessor('seq', builder.number()),
];

export const FeedsPanel = () => {
  const devtoolsHost = useDevtools();
  const setContext = useDevtoolsDispatch();
  const { space, feedKey } = useDevtoolsState();
  const messages = useFeedMessages({ feedKey }).reverse();

  const [refreshCount, setRefreshCount] = useState(0);
  const feedKeys = [
    ...(space?.internal.data.pipeline?.controlFeeds ?? []),
    ...(space?.internal.data.pipeline?.dataFeeds ?? []),
  ];
  const { feeds } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys }), {}, [refreshCount]);
  const feed = feeds?.find((feed) => feedKey && feed.feedKey.equals(feedKey));

  // TODO(burdon): Not updated in realtime.
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
        <Toolbar.Root>
          <SpaceSelector />
          <PublicKeySelector
            placeholder='Select feed'
            getLabel={getLabel}
            keys={feedKeys}
            value={key}
            onChange={handleSelect}
          />

          <Toolbar.Button onClick={handleRefresh}>
            <ArrowClockwise className={getSize(5)} />
          </Toolbar.Button>
        </Toolbar.Root>
      }
    >
      <div className='flex flex-col overflow-hidden'>
        <Bitbar value={feed?.downloaded ?? new Uint8Array()} length={feed?.length ?? 0} className='m-4' />
        <MasterDetailTable<SubscribeToFeedBlocksResponse.Block>
          columns={columns}
          data={messages}
          widths={['is-1/4 shrink-0', '']}
        />
      </div>
    </PanelContainer>
  );
};
