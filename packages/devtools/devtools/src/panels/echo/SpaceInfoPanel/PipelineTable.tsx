//
// Copyright 2020 DXOS.org
//

import React, { type FC, useCallback, useMemo } from 'react';

import { Format } from '@dxos/echo/internal';
import { PublicKey } from '@dxos/keys';
import { type Space as SpaceProto } from '@dxos/protocols/proto/dxos/client/services';
import { type SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { DynamicTable, type TableFeatures, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { Timeframe } from '@dxos/timeframe';
import { ComplexSet } from '@dxos/util';

import { useDevtoolsDispatch } from '../../../hooks';

export type PipelineTableRow = {
  id: string;
  feedKey: PublicKey;
  type: string;
  genesis?: boolean;
  own?: boolean;
  start?: number;
  processed?: number;
  target?: number;
  total?: number;
  progress?: string;
};

export type PipelineTableProps = {
  state: SpaceProto.PipelineState;
  metadata: SubscribeToSpacesResponse.SpaceInfo | undefined;
  onSelect?: (feed: PipelineTableRow | undefined) => void;
};

export const PipelineTable: FC<PipelineTableProps> = ({ state, metadata, onSelect }) => {
  const setContext = useDevtoolsDispatch();

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'feedKey', format: Format.TypeFormat.DID },
      {
        name: 'type',
        format: Format.TypeFormat.SingleSelect,
        size: 80,
        config: {
          options: [
            { id: 'control', title: 'control', color: 'blue' },
            { id: 'data', title: 'data', color: 'sky' },
          ],
        },
      },
      { name: 'own', format: Format.TypeFormat.Boolean, size: 90 },
      { name: 'genesis', format: Format.TypeFormat.Boolean, size: 100 },
      { name: 'start', format: Format.TypeFormat.Number, size: 100 },
      { name: 'target', format: Format.TypeFormat.Number, size: 100 },
      { name: 'processed', format: Format.TypeFormat.Number, size: 100 },
      { name: 'total', format: Format.TypeFormat.Number, size: 100 },
      { name: 'progress', format: Format.TypeFormat.String, size: 100 },
    ],
    [],
  );

  const getType = (feedKey: PublicKey) => {
    if (metadata) {
      return {
        genesis: feedKey.equals(metadata?.genesisFeed),
        own: feedKey.equals(metadata?.controlFeed) || feedKey.equals(metadata?.dataFeed),
      };
    }

    return {
      genesis: false,
      own: false,
    };
  };

  const rows = useMemo(() => {
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

    const tableRows: PipelineTableRow[] = [
      ...controlKeys.map((feedKey): PipelineTableRow => {
        const start = 0;
        const processed = state.currentControlTimeframe?.get(feedKey);
        const target = state.targetControlTimeframe?.get(feedKey);
        const total = state.totalControlTimeframe?.get(feedKey);

        const percent = (((processed ?? 0) - start) / ((target ?? 0) - start)) * 100;
        const progress = !isNaN(percent) ? `${Math.min(percent, 100).toFixed(0)}%` : undefined;

        return {
          id: feedKey.toString(),
          feedKey,
          type: 'control',
          ...getType(feedKey),
          start,
          processed,
          target,
          total,
          progress,
        };
      }),
      ...dataKeys.map((feedKey): PipelineTableRow => {
        const start = state.startDataTimeframe?.get(feedKey) ?? 0;
        const processed = state.currentDataTimeframe?.get(feedKey);
        const target = state.targetDataTimeframe?.get(feedKey);
        const total = state.totalDataTimeframe?.get(feedKey);

        const percent = (((processed ?? 0) - start) / ((target ?? 0) - start)) * 100;
        const progress = !isNaN(percent) ? `${Math.min(percent, 100).toFixed(0)}%` : undefined;

        return {
          id: feedKey.toString(),
          feedKey,
          type: 'data',
          ...getType(feedKey),
          start,
          processed,
          target,
          total,
          progress,
        };
      }),
    ];

    return tableRows;
  }, [state, metadata]);

  const handleRowClicked = useCallback(
    (row: PipelineTableRow) => {
      if (row) {
        setContext((ctx) => ({ ...ctx, feedKey: row.feedKey }));
        onSelect?.(row);
      } else {
        setContext((ctx) => ({ ...ctx, feedKey: undefined }));
      }
    },
    [onSelect, setContext],
  );

  const features: Partial<TableFeatures> = useMemo(() => ({ selection: { enabled: true, mode: 'single' } }), []);

  return <DynamicTable properties={properties} rows={rows} features={features} onRowClick={handleRowClicked} />;
};
