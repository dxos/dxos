//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Table, TableColumn } from '@dxos/mosaic';
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

  const columns: TableColumn<ConnectionInfo.StreamStats>[] = [
    {
      Header: 'Sent',
      align: 'right',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value.toLocaleString()}</span>,
      width: 60,
      accessor: 'bytesSent',
    },
    {
      Header: 'Received',
      align: 'right',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value?.toLocaleString()}</span>,
      width: 60,
      accessor: 'bytesReceived',
    },
    {
      Header: 'Tag',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value}</span>,
      accessor: 'tag',
    },
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

      <Table compact columns={columns} data={connection.streams ?? []} />
    </div>
  );
};
