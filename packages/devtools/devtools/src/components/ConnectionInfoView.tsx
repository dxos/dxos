//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { createNumberColumn, createTextColumn, Grid, GridColumn } from '@dxos/aurora-grid';
import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';

import { DetailsTable } from './DetailsTable';

export interface ConnectionInfoViewProps {
  connection?: ConnectionInfo;
}

// TODO(burdon): Convert to table.
export const ConnectionInfoView = ({ connection }: ConnectionInfoViewProps) => {
  if (!connection) {
    return null;
  }

  const columns: GridColumn<ConnectionInfo.StreamStats>[] = [
    createNumberColumn('bytesSent'),
    createNumberColumn('bytesReceived'),
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

      <Grid<ConnectionInfo.StreamStats> id='id' columns={columns} data={connection.streams ?? []} />
    </div>
  );
};
