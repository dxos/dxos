//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  createBooleanColumn,
  createKeyColumn,
  createTextColumn,
  defaultGridSlots,
  Grid,
  GridColumn,
} from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { PanelContainer, ConnectionInfoView } from '../../../components';

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [sessionId, setSessionId] = useState<PublicKey | undefined>();

  type Connection = SwarmInfo & Partial<ConnectionInfo>;

  const items =
    data?.reduce<Connection[]>((connections, swarm) => {
      if (!swarm.connections?.length) {
        connections.push({ ...swarm });
      } else {
        for (const connection of swarm.connections ?? []) {
          connections.push({ ...swarm, ...connection });
        }
      }
      return connections;
    }, []) ?? [];

  // TODO(burdon): Add peers/connect/disconnect/error info.
  const columns: GridColumn<Connection>[] = [
    createBooleanColumn('active', { accessor: 'isActive' }),
    createKeyColumn('swarm', { accessor: 'id', width: 60 }),
    createKeyColumn('topic', { accessor: 'topic' }),
    createKeyColumn('session', { accessor: 'sessionId', key: true }), // TODO(burdon): Select.
    createKeyColumn('peer', { accessor: 'remotePeerId' }),
    createTextColumn('state'),
  ];

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-auto'>
        <Grid<Connection> columns={columns} data={items} slots={defaultGridSlots} />
      </div>
      <div className='h-1/2 overflow-auto'>
        {sessionId && (
          <ConnectionInfoView
            connection={data
              ?.flatMap((swarm) => swarm.connections)
              .find((connection) => connection?.sessionId?.equals(sessionId))}
          />
        )}
      </div>
    </PanelContainer>
  );
};
