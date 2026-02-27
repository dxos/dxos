//
// Copyright 2020 DXOS.org
//

import React, { type FC, useCallback, useMemo } from 'react';

import { Format } from '@dxos/echo/internal';
import { PublicKey } from '@dxos/keys';
import { bufToTimeframe, toPublicKey } from '@dxos/protocols/buf';
import { type Space_PipelineState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type SubscribeToSpacesResponse_SpaceInfo } from '@dxos/protocols/buf/dxos/devtools/host_pb';
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
  state: Space_PipelineState;
  metadata: SubscribeToSpacesResponse_SpaceInfo | undefined;
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
        genesis: metadata?.genesisFeed ? feedKey.equals(toPublicKey(metadata.genesisFeed)) : false,
        own:
          (metadata?.controlFeed ? feedKey.equals(toPublicKey(metadata.controlFeed)) : false) ||
          (metadata?.dataFeed ? feedKey.equals(toPublicKey(metadata.dataFeed)) : false),
      };
    }

    return {
      genesis: false,
      own: false,
    };
  };

  const rows = useMemo(() => {
    const currentControl = bufToTimeframe(state.currentControlTimeframe);
    const targetControl = bufToTimeframe(state.targetControlTimeframe);
    const totalControl = bufToTimeframe(state.totalControlTimeframe);
    const knownControl = bufToTimeframe(state.knownControlTimeframe);
    const startData = bufToTimeframe(state.startDataTimeframe);
    const currentData = bufToTimeframe(state.currentDataTimeframe);
    const targetData = bufToTimeframe(state.targetDataTimeframe);
    const totalData = bufToTimeframe(state.totalDataTimeframe);
    const knownData = bufToTimeframe(state.knownDataTimeframe);

    const controlKeys = Array.from(
      new ComplexSet(PublicKey.hash, [
        ...(state.controlFeeds ?? []).map(toPublicKey),
        ...Timeframe.merge(currentControl, targetControl, totalControl, knownControl)
          .frames()
          .map(([key]) => key),
      ]),
    );

    const dataKeys = Array.from(
      new ComplexSet(PublicKey.hash, [
        ...(state.dataFeeds ?? []).map(toPublicKey),
        ...Timeframe.merge(currentData, targetData, totalData, knownData)
          .frames()
          .map(([key]) => key),
      ]),
    );

    const tableRows: PipelineTableRow[] = [
      ...controlKeys.map((feedKey): PipelineTableRow => {
        const start = 0;
        const processed = currentControl.get(feedKey);
        const target = targetControl.get(feedKey);
        const total = totalControl.get(feedKey);

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
        const start = startData.get(feedKey) ?? 0;
        const processed = currentData.get(feedKey);
        const target = targetData.get(feedKey);
        const total = totalData.get(feedKey);

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
