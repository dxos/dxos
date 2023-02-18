//
// Copyright 2022 DXOS.org
//

import { WifiHigh, WifiSlash } from 'phosphor-react';
import React from 'react';

import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { Tooltip, valenceColorText, mx, Button } from '@dxos/react-components';

// TODO(burdon): Extend to show heartbeat, network status, etc.
// TODO(burdon): Merge with ErrorBoundary indicator since overlaps.
export const StatusIndicator = () => {
  const { state } = useNetworkStatus();
  const client = useClient();
  const handleStateToggle = async () => {
    void (state === ConnectionState.ONLINE
      ? client.mesh.setConnectionState(ConnectionState.OFFLINE)
      : client.mesh.setConnectionState(ConnectionState.ONLINE));
  };

  const toggleButton = (
    <Button onClick={handleStateToggle}>
      {state && state === ConnectionState.ONLINE ? <WifiHigh /> : <WifiSlash />}
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
          valenceColorText(state && state === ConnectionState.ONLINE ? 'success' : 'error')
        )}
      >
        <Tooltip content={toggleButton}>{state && state === ConnectionState.ONLINE ? onlineBall : offlineBall}</Tooltip>
      </div>
    </div>
  );
};
