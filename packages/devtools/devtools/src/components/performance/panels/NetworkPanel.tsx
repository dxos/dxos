//
// Copyright 2024 DXOS.org
//

import { WifiHigh } from '@phosphor-icons/react';
import React from 'react';

import type { NetworkStatus } from '@dxos/client/mesh';

import { Panel, type CustomPanelProps } from '../Panel';

export const NetworkPanel = ({ network, ...props }: CustomPanelProps<{ network?: NetworkStatus }>) => {
  const swarmCount = network?.connectionInfo?.length ?? 0;
  const connectionCount = network?.connectionInfo?.reduce((acc, info) => acc + (info.connections?.length ?? 0), 0) ?? 0;

  return (
    <Panel
      {...props}
      icon={WifiHigh}
      title='Network'
      info={
        <div className='flex items-center gap-2'>
          <span title='Used (heap size)'>{swarmCount} swarms</span>
          <span title='Used (heap size)'>{connectionCount} conns</span>
        </div>
      }
    />
  );
};
