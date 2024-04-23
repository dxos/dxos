//
// Copyright 2020 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { useMulticastObservable } from '@dxos/react-async';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef } from '@dxos/react-ui-table';
import { getSize } from '@dxos/react-ui-theme';

import { PipelineTable } from './PipelineTable';
import { SpaceProperties } from './SpaceProperties';
import { Bitbar, PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../../../hooks';

type FeedInfo = {
  feedKey: PublicKey;
  downloaded: Uint8Array;
  maxLength: number;
};

const { helper, builder } = createColumnBuilder<FeedInfo>();
const columns: TableColumnDef<FeedInfo, any>[] = [
  helper.accessor('feedKey', builder.key({ tooltip: true })),
  helper.accessor('downloaded', {
    cell: (cell) => (
      <Bitbar value={cell.getValue()} length={cell.row.original.maxLength} size={6} margin={1} height={8} />
    ),
  }),
];

export const SpaceInfoPanel: FC = () => {
  const [, forceUpdate] = React.useState({});
  const { space } = useDevtoolsState();

  // TODO(burdon): Constant updates.
  // TODO(burdon): Out of order with main table.
  const feedKeys = [
    ...(space?.internal.data.pipeline?.controlFeeds ?? []),
    ...(space?.internal.data.pipeline?.dataFeeds ?? []),
  ];
  const devtoolsHost = useDevtools();
  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys }), {}, [feedKeys]);
  const maxLength = feeds.reduce((max, feed) => (feed?.length > max ? feed.length : max), 0);
  const updatedFeeds = feeds.map((feed) => ({ ...feed, maxLength }));

  // TODO(dmaretskyi): We don't need SpaceInfo anymore?
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => info.key.equals(space?.key));
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty());

  const navigate = useNavigate();
  const setContext = useDevtoolsDispatch();
  const handleSelect = (selected: FeedInfo | undefined) => {
    setContext((ctx) => ({ ...ctx, feedKey: selected?.feedKey }));
    navigate('/echo/feeds');
  };

  const toggleActive = async () => {
    const state = space!.state.get();
    if (state === SpaceState.INACTIVE) {
      await space!.internal.open();
    } else {
      await space!.internal.close();
    }
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
          <Toolbar.Button onClick={() => forceUpdate({})}>
            <ArrowClockwise className={getSize(5)} />
          </Toolbar.Button>
          <div className='grow' />
          <Toolbar.Button onClick={toggleActive}>
            {space?.state.get() === SpaceState.INACTIVE ? 'Open' : 'Close'}
          </Toolbar.Button>
        </Toolbar.Root>
      }
    >
      {space && metadata && (
        <div className='flex flex-col gap-4'>
          <SpaceProperties space={space} metadata={metadata} />
          <PipelineTable state={pipelineState ?? {}} metadata={metadata} />
          <Table<FeedInfo> columns={columns} data={updatedFeeds} onDatumClick={handleSelect} fullWidth />
        </div>
      )}
    </PanelContainer>
  );
};
