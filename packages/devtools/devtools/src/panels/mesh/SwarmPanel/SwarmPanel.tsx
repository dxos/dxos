//
// Copyright 2021 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { createColumnBuilder, Grid, GridColumnDef } from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { ComplexMap } from '@dxos/util';

import { PanelContainer } from '../../../components';
import { ConnectionInfoView } from './ConnectionInfoView';

type SwarmConnection = SwarmInfo & { connection?: ConnectionInfo };

// TODO(burdon): Add peers/connect/disconnect/error info.
const { helper, builder } = createColumnBuilder<SwarmConnection>();
const columns: GridColumnDef<SwarmConnection, any>[] = [
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

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data: swarms = [] } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [sessionId, setSessionId] = useState<PublicKey>();
  const handleSelect = (selected: SwarmConnection[] | undefined) => {
    setSessionId(selected?.[0].connection?.sessionId);
  };

  const connectionMap = useMemo(() => new ComplexMap<PublicKey, ConnectionInfo>(PublicKey.hash), []);
  const connection = sessionId ? connectionMap.get(sessionId) : undefined;
  const items = swarms.reduce<SwarmConnection[]>((connections, swarm) => {
    if (!swarm.connections?.length) {
      connections.push(swarm);
    } else {
      for (const connection of swarm.connections ?? []) {
        connectionMap.set(connection.sessionId, connection);
        connections.push({ ...swarm, connection });
      }
    }

    return connections;
  }, []) ?? [swarms];

  return (
    <PanelContainer>
      <div className='h-1/3 overflow-auto'>
        <Grid<SwarmConnection> columns={columns} data={items} onSelectedChange={handleSelect} />
      </div>
      <div className='h-2/3 overflow-auto'>{connection && <ConnectionInfoView connection={connection} />}</div>
    </PanelContainer>
  );
};
