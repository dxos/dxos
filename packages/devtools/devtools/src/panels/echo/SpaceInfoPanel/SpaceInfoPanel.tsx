//
// Copyright 2020 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { MulticastObservable } from '@dxos/async';
import { Toolbar } from '@dxos/aurora';
import { createColumnBuilder, Grid, GridColumnDef } from '@dxos/aurora-grid';
import { getSize } from '@dxos/aurora-theme';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useMulticastObservable } from '@dxos/react-async';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { Bitbar, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../../../hooks';
import { PipelineTable } from './PipelineTable';
import { SpaceProperties } from './SpaceProperties';

const { helper, builder } = createColumnBuilder<SubscribeToFeedsResponse.Feed>();
const columns: GridColumnDef<SubscribeToFeedsResponse.Feed, any>[] = [
  helper.accessor('feedKey', builder.createKey({ tooltip: true })),
  helper.accessor('downloaded', {
    cell: (cell) => <Bitbar value={cell.getValue()} length={cell.row.original.length} size={6} margin={1} height={8} />,
  }),
];

export const SpaceInfoPanel: FC = () => {
  const [, forceUpdate] = React.useState({});
  const { space } = useDevtoolsState();

  // TODO(dmaretskyi): We don't need SpaceInfo anymore?
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => info.key.equals(space?.key));
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty());

  // TODO(burdon): Doesn't update in realtime (set interval if not 100%).
  // TODO(burdon): Out of order with main table.
  const feedKeys = [
    ...(space?.internal.data.pipeline?.controlFeeds ?? []),
    ...(space?.internal.data.pipeline?.dataFeeds ?? []),
  ];
  const devtoolsHost = useDevtools();
  const { feeds = [] } = useStream(() => devtoolsHost.subscribeToFeeds({ feedKeys }), {}, [feedKeys]);

  const navigate = useNavigate();
  const setContext = useDevtoolsDispatch();
  const handleSelect = (selected: SubscribeToFeedsResponse.Feed[] | undefined) => {
    setContext((ctx) => ({ ...ctx, feedKey: selected?.[0]?.feedKey }));
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

  if (!space || !metadata) {
    return null;
  }

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
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
      <div className='flex flex-col gap-4'>
        <SpaceProperties space={space} metadata={metadata} />
        <PipelineTable state={pipelineState ?? {}} metadata={metadata} />
        <Grid<SubscribeToFeedsResponse.Feed> columns={columns} data={feeds} onSelectedChange={handleSelect} />
      </div>
    </PanelContainer>
  );
};
