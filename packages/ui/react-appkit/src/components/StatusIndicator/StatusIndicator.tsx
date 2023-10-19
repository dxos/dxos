//
// Copyright 2022 DXOS.org
//

import { WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/react-ui';
import { valenceColorText, mx } from '@dxos/react-ui-theme';
import { useClient } from '@dxos/react-client';
import { ConnectionState, useNetworkStatus } from '@dxos/react-client/mesh';

import { Tooltip } from '../Tooltip';

// TODO(burdon): Extend to show heartbeat, network status, etc.
// TODO(burdon): Merge with ErrorBoundary indicator since overlaps.
export const StatusIndicator = () => {
  const { swarm } = useNetworkStatus();
  const client = useClient();
  const handleStateToggle = async () => {
    void (swarm === ConnectionState.ONLINE
      ? client.mesh.updateConfig(ConnectionState.OFFLINE)
      : client.mesh.updateConfig(ConnectionState.ONLINE));
  };

  const toggleButton = (
    <Button onClick={handleStateToggle}>
      {swarm && swarm === ConnectionState.ONLINE ? <WifiHigh /> : <WifiSlash />}
    </Button>
  );
  const onlineBall = (
    <span className='flex h-3 w-3'>
      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75'></span>
      <span className='relative inline-flex rounded-full h-3 w-3 bg-green-700'></span>
    </span>
  );
  const offlineBall = (
    <span className='flex h-3 w-3'>
      <span className='relative inline-flex rounded-full h-3 w-3 bg-red-500'></span>
    </span>
  );
  return (
    <div role='none' className={mx('fixed bottom-4 right-4')}>
      <div
        role='none'
        className={mx(
          'fixed bottom-4 right-4',
          valenceColorText(swarm && swarm === ConnectionState.ONLINE ? 'success' : 'error'),
        )}
      >
        <Tooltip content={toggleButton}>{swarm && swarm === ConnectionState.ONLINE ? onlineBall : offlineBall}</Tooltip>
      </div>
    </div>
  );
};
