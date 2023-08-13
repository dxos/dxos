//
// Copyright 2020 DXOS.org
//

import { Check } from '@phosphor-icons/react';
import React, { FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { MulticastObservable } from '@dxos/async';
import { Button, Toolbar } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { Table, TableColumn } from '@dxos/mosaic';
import { Space as SpaceProto, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useMulticastObservable } from '@dxos/react-async';
import { PublicKey } from '@dxos/react-client';
import { Timeframe } from '@dxos/timeframe';
import { ComplexSet, humanize } from '@dxos/util';

import { DetailsTable, PanelContainer } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../../hooks';

const SpaceInfoPanel: FC = () => {
  const { space } = useDevtoolsState();
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => info.key.equals(space?.key));
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty());

  // TODO(burdon): Factor out.
  // TODO(dmaretskyi): We don't need SpaceInfo anymore?
  const object = useMemo(() => {
    if (!metadata) {
      return undefined;
    }

    const pipeline = space?.internal.data?.pipeline;
    const epochTimeframe = pipeline?.currentEpoch?.subject.assertion.timeframe ?? new Timeframe();
    const currentEpochNumber = pipeline?.currentEpoch?.subject.assertion.number;
    const appliedEpochNumber = pipeline?.appliedEpoch?.subject.assertion.number;

    const targetControlMessages = pipeline?.targetControlTimeframe?.totalMessages() ?? 0;
    const currentControlMessages = pipeline?.currentControlTimeframe?.totalMessages() ?? 0;

    const startDataMessages = pipeline?.startDataTimeframe?.totalMessages() ?? 0;
    const targetDataMessages = pipeline?.targetDataTimeframe?.totalMessages() ?? 0;
    const currentDataMessages = pipeline?.currentDataTimeframe?.totalMessages() ?? 0;
    const dataProgress = Math.min(
      Math.abs((currentDataMessages - startDataMessages) / (targetDataMessages - startDataMessages) || 1),
      1,
    );

    const { open, ready } = space?.internal.data?.metrics ?? {};
    const startupTime = open && ready && ready.getTime() - open.getTime();

    return {
      id: metadata.key.truncate(),
      name: space.properties.name ?? humanize(metadata?.key),
      state: SpaceState[space.state.get()] ?? 'Unknown',
      currentEpoch:
        currentEpochNumber === appliedEpochNumber
          ? currentEpochNumber
          : `${currentEpochNumber} (${appliedEpochNumber})`,
      epochStashedMutations: pipeline?.currentEpoch?.subject.assertion.timeframe.totalMessages() ?? 0,
      currentEpochTime: pipeline?.currentEpoch?.issuanceDate?.toISOString(),
      mutationsAfterEpoch: pipeline?.totalDataTimeframe?.newMessages(epochTimeframe),
      controlProgress: `${(Math.min(currentControlMessages / targetControlMessages, 1) * 100).toFixed(0)}%`,
      dataProgress: dataProgress && `${dataProgress * 100}%`,
      startupTime: startupTime && `${startupTime}ms`,
      // ...Object.fromEntries(Object.entries(space?.internal.data?.metrics ?? {}).map(([key, value]) => [`metrics.${key}`, value?.toISOString()])),
    };
  }, [metadata, pipelineState, space]);

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
        <Toolbar>
          <SpaceSelector />
          <Button onClick={toggleActive}>{space?.state.get() === SpaceState.INACTIVE ? 'Open' : 'Close'}</Button>
        </Toolbar>
      }
      className='overflow-auto'
    >
      <div className='flex flex-col flex-1 overflow-auto divide-y space-y-2'>
        {object && <DetailsTable object={object} />}
        <PipelineTable state={pipelineState ?? {}} metadata={metadata} />
      </div>
    </PanelContainer>
  );
};

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

const columns: TableColumn<PipelineTableRow>[] = [
  {
    Header: 'FeedKey',
    width: 80,
    Cell: ({ value, row }: any) => {
      const setContext = useDevtoolsDispatch();
      const navigate = useNavigate();
      const onClick = () => {
        setContext((ctx) => ({ ...ctx, feedKey: row.original.feedKey }));
        navigate('/echo/feeds');
      };

      return (
        <a className='font-mono text-blue-800 cursor-pointer' onClick={onClick}>
          {value}
        </a>
      );
    },
    accessor: (block) => {
      const feedKey = block.feedKey;
      return `${feedKey.truncate()}`;
    },
  },
  {
    Header: 'Type',
    width: 80,
    accessor: 'type',
  },
  {
    Header: 'Gen',
    width: 40,
    Cell: ({ value }: any) => (value ? <Check className={mx('text-green-500', getSize(5))} /> : null),
    accessor: 'genesis',
  },
  {
    Header: 'Own',
    width: 40,
    Cell: ({ value }: any) => (value ? <Check className={mx('text-green-500', getSize(5))} /> : null),
    accessor: 'own',
  },
  {
    Header: 'Progress',
    width: 80,
    accessor: (block) => {
      const percent =
        (((block.processed ?? 0) - (block.start ?? 0)) / ((block.target ?? 0) - (block.start ?? 0))) * 100;
      if (isNaN(percent)) {
        return '';
      } else {
        return `${Math.min(percent, 100).toFixed(0)}%`;
      }
    },
  },
  {
    Header: 'Start',
    width: 80,
    accessor: 'start',
  },
  {
    Header: 'Processed',
    width: 80,
    accessor: 'processed',
  },
  {
    Header: 'Target',
    width: 80,
    accessor: 'target',
  },
  {
    Header: 'Total',
    width: 80,
    accessor: 'total',
  },
];

const PipelineTable = ({
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

  return <Table compact columns={columns} data={data} />;
};

export default SpaceInfoPanel;
