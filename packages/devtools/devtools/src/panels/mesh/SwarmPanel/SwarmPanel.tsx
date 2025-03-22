//
// Copyright 2021 DXOS.org
//

import bytes from 'bytes';
import React, { useMemo, useState, useCallback } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { type ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { type SpaceMember, useMembers, useSpaces } from '@dxos/react-client/echo';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';
import { ComplexMap } from '@dxos/util';

import { ConnectionInfoView } from './ConnectionInfoView';
import { PanelContainer } from '../../../components';
import { styles } from '../../../styles';

// Extend with table-specific properties
type TableSwarmConnection = {
  id: string; // String ID for table
  swarmId: PublicKey; // Original ID
  swarmTopic: PublicKey; // Original topic
  isActive: string; // For SingleSelect
  label?: string;
  session?: string;
  remotePeer?: string;
  identity?: string;
  state?: string;
  buffer?: string;
  transportDetails?: string;
  statsDisplay?: string;
  closeReason?: string;
  connection?: ConnectionInfo;
};

const stateOptions = [
  { id: 'CONNECTED', title: 'CONNECTED', color: 'green' },
  { id: 'CONNECTING', title: 'CONNECTING', color: 'blue' },
  { id: 'INITIAL', title: 'INITIAL', color: 'blue' },
  { id: 'CREATED', title: 'CREATED', color: 'blue' },
  { id: 'CLOSING', title: 'CLOSING', color: 'red' },
  { id: 'CLOSED', title: 'CLOSED', color: 'red' },
  { id: 'ABORTING', title: 'ABORTING', color: 'amber' },
  { id: 'ABORTED', title: 'ABORTED', color: 'amber' },
];

const properties: TablePropertyDefinition[] = [
  { name: 'swarmId', format: FormatEnum.DID, title: 'swarm', size: 120 },
  { name: 'swarmTopic', format: FormatEnum.DID, title: 'topic', size: 140 },
  { name: 'label', format: FormatEnum.String },
  {
    name: 'isActive',
    format: FormatEnum.SingleSelect,
    size: 100,
    title: 'active',
    config: {
      options: [
        { id: 'true', title: 'YES', color: 'green' },
        { id: 'false', title: 'NO', color: 'red' },
      ],
    },
  },
  { name: 'session', format: FormatEnum.DID },
  { name: 'remotePeer', format: FormatEnum.DID, size: 140, title: 'remote peer' },
  { name: 'identity', format: FormatEnum.DID, size: 160 },
  {
    name: 'state',
    format: FormatEnum.SingleSelect,
    size: 140,
    config: {
      options: stateOptions,
    },
  },
  { name: 'buffer', format: FormatEnum.JSON, title: 'buffer (r/w)', size: 140 },
  { name: 'transportDetails', format: FormatEnum.JSON, title: 'details' },
  { name: 'statsDisplay', format: FormatEnum.JSON, title: 'stats' },
  { name: 'closeReason', format: FormatEnum.JSON, title: 'close reason', size: 400 },
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
  const connectionMap = useMemo(() => new ComplexMap<PublicKey, ConnectionInfo>(PublicKey.hash), []);
  const connection = sessionId ? connectionMap.get(sessionId) : undefined;

  // The state options order determines the sorting priority

  const data = useMemo(() => {
    const connections: TableSwarmConnection[] = [];

    for (const swarm of swarms) {
      if (!swarm.connections?.length) {
        connections.push({
          id: swarm.id.toHex(), // For table key
          swarmId: swarm.id,
          swarmTopic: swarm.topic,
          label: swarm.label,
          isActive: swarm.isActive ? 'true' : 'false',
        });
      } else {
        for (const connection of swarm.connections) {
          let identityDisplay = '';
          const identity = identityMap.get(connection.remotePeerId)?.identity;
          if (identity) {
            identityDisplay = identity.identityKey.truncate();
            if (identity.profile?.displayName) {
              identityDisplay = identityDisplay + ' (' + identity.profile?.displayName + ')';
            }
          }

          connectionMap.set(connection.sessionId, connection);

          const stats = getStats(connection);
          const statsDisplay = stats ? `↑ ${bytes(stats.bytesSent)} ↓ ${bytes(stats.bytesReceived)}` : '';

          connections.push({
            id: `${swarm.id.toHex()}-${connection.sessionId.toHex()}`, // For table key
            swarmId: swarm.id,
            swarmTopic: swarm.topic,
            label: swarm.label,
            isActive: swarm.isActive ? 'true' : 'false',
            connection,
            session: connection.sessionId.toHex(),
            remotePeer: connection.remotePeerId?.toHex() ?? '',
            identity: identityDisplay,
            state: connection.state,
            buffer: `${connection.readBufferSize ?? 0} / ${connection.writeBufferSize ?? 0}`,
            transportDetails: connection.transportDetails,
            statsDisplay,
            closeReason: connection.closeReason,
          });
        }
      }
    }

    return connections;
  }, [swarms, identityMap]);

  const handleSelectionChanged = useCallback(
    (selectedIds: string[]) => {
      if (selectedIds.length === 0) {
        setSessionId(undefined);
        return;
      }

      const selectedId = selectedIds[selectedIds.length - 1];
      const selected = data.find((item) => item.id === selectedId);
      if (selected?.connection?.sessionId) {
        setSessionId(selected.connection.sessionId);
      }
    },
    [data],
  );

  return (
    <PanelContainer classNames={mx('divide-y', styles.border)}>
      <div className='h-1/2 overflow-auto'>
        <DynamicTable properties={properties} data={data} onSelectionChanged={handleSelectionChanged} />
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
