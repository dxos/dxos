//
// Copyright 2021 DXOS.org
//

import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import bytes from 'bytes';
import React, { useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { type ConnectionInfo, type SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { type SpaceMember, useMembers, useSpaces } from '@dxos/react-client/echo';
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table';
import { ComplexMap } from '@dxos/util';

import { ConnectionInfoView } from './ConnectionInfoView';
import { PanelContainer } from '../../../components';

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
  helper.accessor('label', {
    header: 'label',
    meta: { cell: { classNames: textPadding } },
  }), // TODO(burdon): Has promise string.
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
  helper.accessor((connection) => connection.connection?.identity, {
    id: 'identity',
    meta: { cell: { classNames: textPadding } },
    size: 160,
  }),
  helper.accessor((connection) => connection.connection?.state, {
    id: 'state',
    getGroupingValue: (value) => value.connection?.state,
    meta: { cell: { classNames: textPadding } },
    cell: (cell) => <span className={stateFormat[cell.getValue()]?.className}>{cell.getValue()}</span>,
  }),
  helper.accessor(
    (connection) =>
      (connection.connection?.readBufferSize ?? 0) + ' / ' + (connection.connection?.writeBufferSize ?? 0),
    {
      id: 'buffer (r/w)',
    },
  ),
  helper.accessor((connection) => connection.connection?.transportDetails, {
    id: 'details',
  }),
  helper.accessor((connection) => connection.connection && getStats(connection.connection), {
    id: 'stats',
    meta: { cell: { classNames: textPadding } },
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
    meta: { cell: { classNames: textPadding } },
    size: 400,
  }),
];

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data: swarms = [] } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const spaces = useSpaces({ all: true });
  const identityMap = new ComplexMap<PublicKey, SpaceMember>(PublicKey.hash);

  for (const space of spaces) {
    const members = useMembers(space.key);
    for (const member of members) {
      // TODO(nf): need to iterate through all the peerstates?
      if (member.peerStates?.length && member.peerStates[0].peerId) {
        identityMap.set(member.peerStates[0].peerId, member);
      }
    }
  }

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
        const identity = identityMap.get(connection.remotePeerId)?.identity;
        if (identity) {
          connection.identity = identity.identityKey.truncate();
          if (identity.profile?.displayName) {
            connection.identity = connection.identity + ' (' + identity.profile?.displayName + ')';
          }
        }
        connectionMap.set(connection.sessionId, connection);
        connections.push({ ...swarm, connection });
      }
    }

    return connections;
  }, []) ?? [swarms];

  // TODO(dmaretskyi): Grid already has some sort features.
  items.sort(comparer((row) => (row.connection ? Object.keys(stateFormat).indexOf(row.connection.state) : Infinity)));

  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <PanelContainer classNames='divide-y'>
      <div ref={containerRef} className='h-1/2 overflow-auto'>
        <Table<SwarmConnection>
          columns={columns}
          data={items}
          keyAccessor={(row) => row.id.toHex()}
          grouping={['topic']}
          onDatumClick={(datum) => handleSelect([datum])}
          getScrollElement={() => containerRef.current}
        />
      </div>
      <div className='h-1/2 overflow-auto'>
        {sessionId ? (
          connection ? (
            <ConnectionInfoView connection={connection} />
          ) : (
            <div className='bs-full flex items-center justify-center'>
              <p role='alert' className='p-4 rounded-lg border border-dashed border-neutral-500/20'>
                No connection for session
              </p>
            </div>
          )
        ) : (
          <div className='bs-full flex items-center justify-center'>
            <p role='alert' className='p-4 rounded-lg border border-dashed border-neutral-500/20'>
              Select a session
            </p>
          </div>
        )}
      </div>
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
  ABORTING: { className: 'text-red-300' },
  ABORTED: { className: 'text-red-300' },
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
