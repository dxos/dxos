//
// Copyright 2021 DXOS.org
//

import React, { type FC } from 'react';

import { type ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { AnchoredOverflow } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef, textPadding } from '@dxos/react-ui-table';

import { PropertiesTable, PropertySchemaFormat } from '../../../components';

const { helper, builder } = createColumnBuilder<ConnectionInfo.StreamStats>();
const columns: TableColumnDef<ConnectionInfo.StreamStats, any>[] = [
  helper.accessor('bytesSent', builder.number({ header: 'sent' })),
  helper.accessor('bytesReceived', builder.number({ header: 'received' })),
  helper.accessor('bytesSentRate', builder.number({ header: 'sent b/s' })),
  helper.accessor('bytesReceivedRate', builder.number({ header: 'received b/s' })),
  helper.accessor('writeBufferSize', builder.number({ header: 'write buffer' })),
  helper.accessor('tag', { meta: { cell: { classNames: textPadding } } }),
];

const schema = {
  session: PropertySchemaFormat.key(),
  remotePeer: PropertySchemaFormat.key(),
};

// TODO(burdon): Stream results.
export const ConnectionInfoView: FC<{ connection?: ConnectionInfo }> = ({ connection }) => {
  if (!connection) {
    return null;
  }

  return (
    <>
      <PropertiesTable
        schema={schema}
        object={{
          state: connection.state,
          transportBytesSent: connection.transportBytesSent,
          transportBytesReceived: connection.transportBytesReceived,
          closeReason: connection.closeReason,
          session: connection.sessionId,
          remotePeer: connection.remotePeerId,
          transport: connection.transport ?? 'N/A',
          extensions: connection.protocolExtensions?.join(',') || 'none',
        }}
      />

      <Table.Root>
        <Table.Viewport classNames='flex grow overflow-anchored'>
          <Table.Table<ConnectionInfo.StreamStats>
            columns={columns}
            data={connection.streams ?? []}
            keyAccessor={(row) => row.id.toString()}
            fullWidth
          />
          <AnchoredOverflow.Anchor />
        </Table.Viewport>
      </Table.Root>
    </>
  );
};
