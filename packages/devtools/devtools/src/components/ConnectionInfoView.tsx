//
// Copyright 2021 DXOS.org
//

import React, { FC } from 'react';

import { createColumnBuilder, Grid, GridColumnDef } from '@dxos/aurora-grid';
import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';

import { DetailsTable } from './DetailsTable';

export const ConnectionInfoView: FC<{ connection?: ConnectionInfo }> = ({ connection }) => {
  if (!connection) {
    return null;
  }

  const { helper, builder } = createColumnBuilder<ConnectionInfo.StreamStats>();
  const columns: GridColumnDef<ConnectionInfo.StreamStats, any>[] = [
    helper.accessor('bytesSent', builder.createNumber({ header: 'sent' })),
    helper.accessor('bytesReceived', builder.createNumber({ header: 'received' })),
    helper.accessor('bytesSentRate', builder.createNumber({ header: 'sent b/s' })),
    helper.accessor('bytesReceivedRate', builder.createNumber({ header: 'received b/s' })),
    helper.accessor('tag', {}),
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

      <Grid<ConnectionInfo.StreamStats> columns={columns} data={connection.streams ?? []} />
    </div>
  );
};
