//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createBooleanColumn,
  createColumn,
  createKeyColumn,
  createNumberColumn,
  createTextColumn,
  defaultGridSlots,
  Grid,
  GridColumn,
} from '@dxos/aurora-grid';
import { Space as SpaceProto } from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { PublicKey } from '@dxos/react-client';
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

const columns: GridColumn<PipelineTableRow>[] = [
  createKeyColumn('feedKey', { key: true }),
  createTextColumn('type'),
  createBooleanColumn('own', { width: 40 }),
  createBooleanColumn('genesis', { width: 40, header: { label: 'gen' } }),
  createNumberColumn('start'),
  createNumberColumn('target'),
  createNumberColumn('processed'),
  createNumberColumn('total'),
  createColumn('progress', {
    accessor: (row) => {
      const percent = (((row.processed ?? 0) - (row.start ?? 0)) / ((row.target ?? 0) - (row.start ?? 0))) * 100;
      if (!isNaN(percent)) {
        return `${Math.min(percent, 100).toFixed(0)}%`;
      }
    },
  }),
];

export const PipelineTable = ({
  state,
  metadata,
}: {
  state: SpaceProto.PipelineState;
  metadata: SubscribeToSpacesResponse.SpaceInfo | undefined;
}) => {
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
  const handleSelect = (feedKey: PublicKey) => {
    setContext((ctx) => ({ ...ctx, feedKey }));
    navigate('/echo/feeds');
  };

  return (
    <Grid<PipelineTableRow>
      slots={defaultGridSlots}
      columns={columns}
      data={data}
      onSelect={(selected) => handleSelect(PublicKey.from(selected))}
    />
  );
};
