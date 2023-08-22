//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { createColumnBuilder, Grid, GridColumnDef } from '@dxos/aurora-grid';
import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { ConnectionInfoView, PanelContainer } from '../../../components';

type SwarmConnection = { rowId: number } & SwarmInfo & { connection?: ConnectionInfo };

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data: swarms = [] } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [connection, setConnection] = useState<ConnectionInfo>();
  const handleSelect = (selected: SwarmConnection[] | undefined) => {
    setConnection(selected?.[0].connection);
  };

  let i = 0;
  const items =
    swarms.reduce<SwarmConnection[]>((connections, swarm) => {
      if (!swarm.connections?.length) {
        connections.push({ rowId: i++, ...swarm });
      } else {
        for (const connection of swarm.connections ?? []) {
          connections.push({ rowId: i++, ...swarm, connection });
        }
      }
      return connections;
    }, []) ?? [];

  // TODO(burdon): Add peers/connect/disconnect/error info.
  const { helper, builder } = createColumnBuilder<SwarmConnection>();
  const columns: GridColumnDef<SwarmConnection, any>[] = [
    helper.accessor('rowId', { meta: { hidden: true } }),
    helper.accessor('id', builder.createKey({ header: 'swarm', tooltip: true })),
    helper.accessor('topic', builder.createKey({ tooltip: true })),
    helper.accessor('isActive', builder.createIcon({ header: 'active' })),
    helper.accessor((connection) => connection.connection?.sessionId, {
      id: 'session',
      ...builder.createKey({ tooltip: true }),
    }),
    helper.accessor((connection) => connection.connection?.remotePeerId, {
      id: 'remote peer',
      ...builder.createKey({ tooltip: true }),
    }),
    helper.accessor((connection) => connection.connection?.state, {
      id: 'state',
    }),
  ];

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-auto'>
        <Grid<SwarmConnection> columns={columns} data={items} onSelectedChange={handleSelect} />
      </div>
      <div className='h-1/2 overflow-auto'>{connection && <ConnectionInfoView connection={connection} />}</div>
    </PanelContainer>
  );
};
