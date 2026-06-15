//
// Copyright 2024 DXOS.org
//

import React from 'react';

import type { NetworkStatus } from '@dxos/client/mesh';
import { ConnectionState } from '@dxos/network-manager';

import { type CustomPanelProps, Panel } from '../Panel';

export const NetworkPanel = ({ network, ...props }: CustomPanelProps<{ network?: NetworkStatus }>) => {
  const swarmCount = network?.connectionInfo?.length ?? 0;
  const connectionCount =
    network?.connectionInfo?.reduce(
      (acc, info) => acc + (info.connections?.filter((conn) => conn.state === ConnectionState.CONNECTED).length ?? 0),
      0,
    ) ?? 0;

  return (
    <Panel
      {...props}
      icon='ph--wifi-high--regular'
      title='Network'
      info={
        <div className='flex items-center gap-2'>
          <span title='Active Connection(s)'>{connectionCount} Connection(s)</span>
          <span title='Active Swarm(s)'>{swarmCount} Swarm(s)</span>
        </div>
      }
    />
  );
};
