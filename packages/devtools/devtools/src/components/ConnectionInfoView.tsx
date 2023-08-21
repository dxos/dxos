//
// Copyright 2021 DXOS.org
//

import React, { FC } from 'react';

import { createNumberColumn, createTextColumn, defaultGridSlots, Grid, GridColumn } from '@dxos/aurora-grid';
import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';

import { DetailsTable } from './DetailsTable';

export const ConnectionInfoView: FC<{ connection?: ConnectionInfo }> = ({ connection }) => {
  if (!connection) {
    return null;
  }

  const columns: GridColumn<ConnectionInfo.StreamStats>[] = [
    createNumberColumn('id', { key: true, hidden: true }),
    createNumberColumn('bytesSent', { width: 100, header: { label: 'sent' } }),
    createNumberColumn('bytesReceived', { width: 100, header: { label: 'received' } }),
    createTextColumn('tag'),
  ];

  return (
    <div>
      <DetailsTable
        object={{
          state: connection.state,
          sessionId: connection.sessionId.truncate(),
          remotePeerId: connection.remotePeerId.truncate(),
          transport: connection.transport ?? 'N/A',
          extensions: connection.protocolExtensions?.join(',') || 'none',
        }}
      />

      <Grid<ConnectionInfo.StreamStats> columns={columns} data={connection.streams ?? []} slots={defaultGridSlots} />
    </div>
  );
};
