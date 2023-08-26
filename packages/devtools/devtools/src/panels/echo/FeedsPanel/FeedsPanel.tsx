//
// Copyright 2020 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Toolbar } from '@dxos/aurora';
import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { getSize } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { BitfieldDisplay, MasterDetailTable, PanelContainer, PublicKeySelector } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../../hooks';

const { helper, builder } = createColumnBuilder<SubscribeToFeedBlocksResponse.Block>();
const columns: GridColumnDef<SubscribeToFeedBlocksResponse.Block, any>[] = [
  helper.accessor('feedKey', builder.createKey({ header: 'key', tooltip: true })),
  helper.accessor('seq', builder.createNumber()),
];

export const FeedsPanel = () => {
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
      <div className='flex flex-col'>
        <BitfieldDisplay value={meta?.downloaded ?? new Uint8Array()} length={meta?.length ?? 0} />
        <MasterDetailTable<SubscribeToFeedBlocksResponse.Block> columns={columns} data={messages} />
      </div>
    </PanelContainer>
  );
};
