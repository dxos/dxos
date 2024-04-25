//
// Copyright 2020 DXOS.org
//

import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { PublicKey } from '@dxos/keys';
import { type Space as SpaceProto } from '@dxos/protocols/proto/dxos/client/services';
import { type SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { AnchoredOverflow } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table';
import { Timeframe } from '@dxos/timeframe';
import { ComplexSet } from '@dxos/util';

import { useDevtoolsDispatch } from '../../../hooks';

export type PipelineTableRow = {
  feedKey: PublicKey;
  type: string;
  genesis?: boolean;
  own?: boolean;
  start?: number;
  processed?: number;
  target?: number;
  total?: number;
};

const { helper, builder } = createColumnBuilder<PipelineTableRow>();
const columns: TableColumnDef<PipelineTableRow, any>[] = [
  helper.accessor('feedKey', builder.key({ tooltip: true })),
  helper.accessor('type', {
    meta: { cell: { classNames: textPadding } },
    size: 60,
  }),
  helper.accessor('own', builder.icon()),
  helper.accessor('genesis', builder.icon({ header: 'gen' })),
  helper.accessor('start', builder.number()),
  helper.accessor('target', builder.number()),
  helper.accessor('processed', builder.number()),
  helper.accessor('total', builder.number()),
  helper.accessor(
    (row) => {
      const percent = (((row.processed ?? 0) - (row.start ?? 0)) / ((row.target ?? 0) - (row.start ?? 0))) * 100;
      if (!isNaN(percent)) {
        return `${Math.min(percent, 100).toFixed(0)}%`;
      }
    },
    {
      id: 'progress',
      meta: { cell: { classNames: [textPadding, 'text-end'] } },
    },
  ),
];

export const PipelineTable: FC<{
  state: SpaceProto.PipelineState;
  metadata: SubscribeToSpacesResponse.SpaceInfo | undefined;
}> = ({ state, metadata }) => {
  const getType = (feedKey: PublicKey) => {
    if (metadata) {
      return {
        genesis: feedKey.equals(metadata?.genesisFeed),
        own: feedKey.equals(metadata?.controlFeed) || feedKey.equals(metadata?.dataFeed),
      };
    }
  };

  const controlKeys = Array.from(
    new ComplexSet(PublicKey.hash, [
      ...(state.controlFeeds ?? []),
      ...Timeframe.merge(
        state.currentControlTimeframe ?? new Timeframe(),
        state.targetControlTimeframe ?? new Timeframe(),
        state.totalControlTimeframe ?? new Timeframe(),
        state.knownControlTimeframe ?? new Timeframe(),
      )
        .frames()
        .map(([key]) => key),
    ]),
  );

  const dataKeys = Array.from(
    new ComplexSet(PublicKey.hash, [
      ...(state.dataFeeds ?? []),
      ...Timeframe.merge(
        state.currentDataTimeframe ?? new Timeframe(),
        state.targetDataTimeframe ?? new Timeframe(),
        state.totalDataTimeframe ?? new Timeframe(),
        state.knownDataTimeframe ?? new Timeframe(),
      )
        .frames()
        .map(([key]) => key),
    ]),
  );

  const data: PipelineTableRow[] = [
    ...controlKeys.map(
      (feedKey): PipelineTableRow => ({
        feedKey,
        type: 'control',
        ...getType(feedKey),
        start: 0,
        processed: state.currentControlTimeframe?.get(feedKey),
        target: state.targetControlTimeframe?.get(feedKey),
        total: state.totalControlTimeframe?.get(feedKey),
      }),
    ),
    ...dataKeys.map(
      (feedKey): PipelineTableRow => ({
        feedKey,
        type: 'data',
        ...getType(feedKey),
        start: state.startDataTimeframe?.get(feedKey) ?? 0,
        processed: state.currentDataTimeframe?.get(feedKey),
        target: state.targetDataTimeframe?.get(feedKey),
        total: state.totalDataTimeframe?.get(feedKey),
      }),
    ),
  ];

  const navigate = useNavigate();
  const setContext = useDevtoolsDispatch();
  const handleSelect = (selected: PipelineTableRow | undefined) => {
    setContext((ctx) => ({ ...ctx, feedKey: selected?.feedKey }));
    navigate('/echo/feeds');
  };

  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <AnchoredOverflow.Root ref={containerRef}>
      <Table<PipelineTableRow>
        columns={columns}
        data={data}
        onDatumClick={handleSelect}
        fullWidth
        getScrollElement={() => containerRef.current}
      />
      ;
      <AnchoredOverflow.Anchor />
    </AnchoredOverflow.Root>
  );
};
