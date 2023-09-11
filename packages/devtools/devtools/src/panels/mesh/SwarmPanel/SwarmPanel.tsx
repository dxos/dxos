//
// Copyright 2021 DXOS.org
//

import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import bytes from 'bytes';
import React, { useMemo, useState } from 'react';

import { createColumnBuilder, Table, TableColumnDef } from '@dxos/aurora-table';
import { PublicKey } from '@dxos/keys';
import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { ComplexMap } from '@dxos/util';

import { PanelContainer } from '../../../components';
import { ConnectionInfoView } from './ConnectionInfoView';

type SwarmConnection = SwarmInfo & { connection?: ConnectionInfo };

// TODO(burdon): Add peers/connect/disconnect/error info.
const { helper, builder } = createColumnBuilder<SwarmConnection>();
const columns: TableColumnDef<SwarmConnection, any>[] = [
  helper.accessor('id', builder.key({ header: 'swarm', tooltip: true })),
  helper.accessor(
    'topic',
    builder.key({
      tooltip: true,
      getGroupingValue: (value) => value.topic.truncate(),
    }),
  ),
  helper.accessor('label', { header: 'label' }), // TODO(burdon): Has promise string.
  helper.accessor('isActive', { ...builder.icon({ header: 'active' }), size: 80 }),
  helper.accessor((connection) => connection.connection?.sessionId, {
    id: 'session',
    ...builder.key({ tooltip: true }),
  }),
  helper.accessor((connection) => connection.connection?.remotePeerId, {
    id: 'remote peer',
    ...builder.key({ label: 'remote', tooltip: true }),
    getGroupingValue: (value) => value.connection?.remotePeerId?.truncate(),
    size: 80,
  }),
  helper.accessor((connection) => connection.connection?.state, {
    id: 'state',
    getGroupingValue: (value) => value.connection?.state,
    cell: (cell) => <span className={stateFormat[cell.getValue()]?.className}>{cell.getValue()}</span>,
  }),
  helper.accessor((connection) => connection.connection && getStats(connection.connection), {
    id: 'stats',
    cell: (cell) =>
      cell.getValue() && (
        <span className='flex flex-row items-baseline gap-1'>
          <ArrowUp />
          {bytes(cell.getValue().bytesSent)}
          <ArrowDown />
          {bytes(cell.getValue().bytesReceived)}
        </span>
      ),
  }),
  helper.accessor((connection) => connection.connection?.closeReason, {
    id: 'close reason',
    size: 400,
  }),
];

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data: swarms = [] } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [sessionId, setSessionId] = useState<PublicKey>();
  const handleSelect = (selected: SwarmConnection[] | undefined) => {
    setSessionId(selected?.[0].connection?.sessionId);
  };

  const connectionMap = useMemo(() => new ComplexMap<PublicKey, ConnectionInfo>(PublicKey.hash), []);
  const connection = sessionId ? connectionMap.get(sessionId) : undefined;
  const items = swarms.reduce<SwarmConnection[]>((connections, swarm) => {
    if (!swarm.connections?.length) {
      connections.push(swarm);
    } else {
      for (const connection of swarm.connections ?? []) {
        connectionMap.set(connection.sessionId, connection);
        connections.push({ ...swarm, connection });
      }
    }

    return connections;
  }, []) ?? [swarms];

  // TODO(dmaretskyi): Grid already has some sort features.
  items.sort(comparer((row) => (row.connection ? Object.keys(stateFormat).indexOf(row.connection.state) : Infinity)));

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-hidden'>
        <Table<SwarmConnection>
          columns={columns}
          data={items}
          keyAccessor={(row) => row.id.toHex()}
          grouping={['topic']}
          onSelectedChange={handleSelect}
        />
      </div>
      <div className='h-1/2 overflow-auto'>{connection && <ConnectionInfoView connection={connection} />}</div>
    </PanelContainer>
  );
};

const stateFormat: Record<string, { className?: string }> = {
  CONNECTED: { className: 'text-green-500' },
  CONNECTING: {},
  INITIAL: {},
  CREATED: {},
  CLOSING: { className: 'text-red-500' },
  CLOSED: { className: 'text-red-500' },
};

const getStats = (connection: ConnectionInfo) => {
  const stats = {
    bytesSent: 0,
    bytesReceived: 0,
    bytesSentRate: 0,
    bytesReceivedRate: 0,
  };
  connection.streams?.forEach((stream) => {
    stats.bytesSent += stream.bytesSent ?? 0;
    stats.bytesReceived += stream.bytesReceived ?? 0;
    stats.bytesSentRate += stream.bytesSentRate ?? 0;
    stats.bytesReceivedRate += stream.bytesReceivedRate ?? 0;
  });

  return stats;
};

// TODO(dmaretskyi): Move to util.
const comparer =
  <T,>(accessor: (x: T) => number, reverse?: boolean) =>
  (a: T, b: T) =>
    reverse ? accessor(b) - accessor(a) : accessor(a) - accessor(b);
