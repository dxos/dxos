//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  createBooleanColumn,
  createKeyColumn,
  createNumberColumn,
  createTextColumn,
  defaultGridSlots,
  Grid,
  GridColumn,
} from '@dxos/aurora-grid';
import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { ConnectionInfoView, PanelContainer } from '../../../components';

type SwarmConnection = { rowId: number } & SwarmInfo & { connection?: ConnectionInfo };

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data: swarms = [] } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [connection, setConnection] = useState<ConnectionInfo>();
  const handleSelect = (_: any, selected: SwarmConnection | SwarmConnection[] | undefined) => {
    setConnection((selected as SwarmConnection)?.connection);
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
  const columns: GridColumn<SwarmConnection>[] = [
    createNumberColumn('rowId', { key: true, hidden: true, header: { label: '' } }),
    createKeyColumn('swarm', { accessor: 'id' }),
    createKeyColumn('topic', { accessor: 'topic' }),
    createBooleanColumn('active', { accessor: 'isActive', width: 60 }),
    createKeyColumn('session', { accessor: (connection) => connection.connection?.sessionId }),
    createKeyColumn('peer', { accessor: (connection) => connection.connection?.remotePeerId }),
    createTextColumn('state', { accessor: (connection) => connection.connection?.state }),
  ];

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-auto'>
        <Grid<SwarmConnection>
          columns={columns}
          data={items}
          onSelectedChange={handleSelect}
          slots={defaultGridSlots}
        />
      </div>
      <div className='h-1/2 overflow-auto'>{connection && <ConnectionInfoView connection={connection} />}</div>
    </PanelContainer>
  );
};
