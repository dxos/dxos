//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Table, TableColumn } from '@dxos/mosaic';
import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';

import { DetailsTable } from './DetailsTable';

export interface ConnectionInfoViewProps {
  connectionInfo?: ConnectionInfo;
  /**
   * @deprecated
   */
  onReturn?: () => void;
}

// TODO(burdon): Convert to table.
export const ConnectionInfoView = ({ connectionInfo, onReturn }: ConnectionInfoViewProps) => {
  if (!connectionInfo) {
    return null;
  }

  const columns: TableColumn<ConnectionInfo.StreamStats>[] = [
    {
      Header: 'Sent',
      align: 'right',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value.toLocaleString()}</span>,
      width: 40,
      accessor: 'bytesSent',
    },
    {
      Header: 'Received',
      align: 'right',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value?.toLocaleString()}</span>,
      width: 40,
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
          state: connectionInfo.state,
          sessionId: connectionInfo.sessionId.toHex(),
          remotePeerId: connectionInfo.remotePeerId.toHex(),
          transport: connectionInfo.transport,
          extensions: connectionInfo.protocolExtensions?.join(','),
        }}
      />
      <Table compact columns={columns} data={connectionInfo.streams ?? []} />
    </div>
  );
};
