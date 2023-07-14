//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { MulticastObservable } from '@dxos/async';
import { mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { Table, TableColumn } from '@dxos/mosaic';
import { Space as SpaceProto } from '@dxos/protocols/proto/dxos/client/services';
import { useMulticastObservable } from '@dxos/react-async';
import { Timeframe } from '@dxos/timeframe';
import { ComplexSet, range } from '@dxos/util';

import { DetailsTable, PanelContainer, Toolbar } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsState, useSpacesInfo } from '../../hooks';

// TODO(burdon): Show master/detail table with currently selected.
const SpacesPanel = () => {
  // TODO(dmaretskyi): We dont need SpaceInfo anymore.
  const { space } = useDevtoolsState();
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => info.key.equals(space?.key));

  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty());

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

    // TODO(burdon): List feeds and nav.
    return {
      id: metadata.key.truncate(),
      name: space.properties.name ?? metadata?.key.truncate(),
      open: metadata.isOpen ? 'true' : 'false', // TODO(burdon): Checkbox.
      genesisFeed: metadata?.genesisFeed.truncate(),
      controlFeed: metadata?.controlFeed.truncate(),
      dataFeed: metadata?.dataFeed.truncate(),
      currentEpoch:
        currentEpochNumber === appliedEpochNumber
          ? currentEpochNumber
          : `${currentEpochNumber} (${appliedEpochNumber})`,
      currentEpochTime: pipeline?.currentEpoch?.issuanceDate?.toISOString(),
      mutationsAfterEpoch: pipeline?.totalDataTimeframe?.newMessages(epochTimeframe),
      controlProgress: `${(Math.min(currentControlMessages / targetControlMessages, 1) * 100).toFixed(0)}%`,
      dataProgress: `${(
        Math.min((currentDataMessages - startDataMessages) / (targetDataMessages - startDataMessages), 1) * 100
      ).toFixed(0)}%`,
      startupTime:
        space?.internal.data?.metrics.open &&
        space?.internal.data?.metrics.ready &&
        space?.internal.data?.metrics.ready.getTime() - space?.internal.data?.metrics.open.getTime(),
      // ...Object.fromEntries(Object.entries(space?.internal.data?.metrics ?? {}).map(([key, value]) => [`metrics.${key}`, value?.toISOString()])),
    };
  }, [metadata, pipelineState, space]);

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <SpaceSelector />
        </Toolbar>
      }
      className='overflow-auto'
    >
      <div className='flex flex-col flex-1 overflow-auto divide-y space-y-2'>
        {object && <DetailsTable object={object} />}
        <PipelineTable state={pipelineState ?? {}} />
      </div>
    </PanelContainer>
  );
};

type PipelineTableRow = {
  feedKey: PublicKey;
  type: string;
  start?: number;
  processed?: number;
  target?: number;
  total?: number;
};

const columns: TableColumn<PipelineTableRow>[] = [
  {
    Header: 'FeedKey',
    width: 80,
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
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
    Header: 'Progress',
    width: 80,
    accessor: (block) => {
      const percent =
        (((block.processed ?? 0) - (block.start ?? 0)) / ((block.target ?? 0) - (block.start ?? 0))) * 100;
      if (isNaN(percent)) {
        return '';
      }
      return `${Math.min(percent, 100).toFixed(0)}%`;
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

const PipelineTable = ({ state }: { state: SpaceProto.PipelineState }) => {
  const epochTimeframe = state.currentEpoch?.subject.assertion.timeframe;

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
        start: state.startDataTimeframe?.get(feedKey) ?? 0,
        processed: state.currentDataTimeframe?.get(feedKey),
        target: state.targetDataTimeframe?.get(feedKey),
        total: state.totalDataTimeframe?.get(feedKey),
      }),
    ),
  ];

  return <Table compact columns={columns} data={data} />;
};

const PipelineOverview = ({ state }: { state: SpaceProto.PipelineState }) => {
  const controlKeys = Timeframe.merge(
    state.currentControlTimeframe ?? new Timeframe(),
    state.targetControlTimeframe ?? new Timeframe(),
    state.totalControlTimeframe ?? new Timeframe(),
    state.knownControlTimeframe ?? new Timeframe(),
  )
    .frames()
    .map(([key]) => key);

  const dataKeys = Timeframe.merge(
    state.currentDataTimeframe ?? new Timeframe(),
    state.targetDataTimeframe ?? new Timeframe(),
    state.totalDataTimeframe ?? new Timeframe(),
    state.knownDataTimeframe ?? new Timeframe(),
  )
    .frames()
    .map(([key]) => key);

  return (
    <div>
      <div>
        <h4>Control feeds</h4>
        {controlKeys.map((feedKey) => (
          <FeedView
            key={feedKey.toHex()}
            feedKey={feedKey}
            processed={state.currentControlTimeframe?.get(feedKey)}
            target={state.targetControlTimeframe?.get(feedKey)}
          />
        ))}
      </div>
      <div>
        <h4>Data feeds</h4>
        {dataKeys.map((feedKey) => (
          <FeedView
            key={feedKey.toHex()}
            feedKey={feedKey}
            processed={state.currentDataTimeframe?.get(feedKey)}
            target={state.targetDataTimeframe?.get(feedKey)}
          />
        ))}
      </div>
    </div>
  );
};

type FeedViewProps = {
  feedKey: PublicKey;
  processed?: number;
  target?: number;
  total?: number;
  known?: number;
};

const FeedView = ({ feedKey, processed = 0, target = 0 }: FeedViewProps) => {
  const total = Math.max(processed);
  return (
    <div className='flex flex-row overflow-auto gap-0.5'>
      <div>{feedKey.truncate()}</div>
      {range(total).map((i) => {
        const color = i <= processed ? 'bg-green-400' : i <= target ? 'bg-orange-400' : 'bg-gray-400';
        return <div key={i} className={mx('w-[3px] h-[20px]', color)}></div>;
      })}
    </div>
  );
};

export default SpacesPanel;
