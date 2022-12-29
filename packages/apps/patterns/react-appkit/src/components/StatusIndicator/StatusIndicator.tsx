//
// Copyright 2022 DXOS.org
//

import React from 'react';

<<<<<<< HEAD
import { NetworkMode } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { Tooltip, useTranslation, valenceColorText, mx, Button } from '@dxos/react-components';
=======
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { Tooltip, useTranslation, valenceColorText, mx, Button } from '@dxos/react-components';
>>>>>>> 508592f22 (Refactor status indicator)

// TODO(burdon): Extend to show heartbeat, network status, etc.
// TODO(burdon): Merge with ErrorBoundary indicator since overlaps.
export const StatusIndicator = ({ status }: { status: boolean }) => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const { state: connectionState } = useNetworkStatus();
  return (
    <div role='none' className={mx('fixed bottom-4 right-4')}>
      <div role='none' className={mx('fixed bottom-4 right-4', valenceColorText('success'))}>
        {status && (
          <span className='flex h-3 w-3'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-3 w-3 bg-green-700'></span>
          </span>
        )}
        {!status && (
          <Tooltip content={t('heartbeat stalled')}>
            <span className='flex h-3 w-3'>
              <span className='relative inline-flex rounded-full h-3 w-3 bg-red-500'></span>
            </span>
          </Tooltip>
        )}
      </div>
      {connectionState !== undefined && (
        <>
          {' '}
          <span className='ml-2'>{connectionState === ConnectionState.ONLINE ? 'ONLINE' : 'OFFLINE'}</span>
          <Button
            onClick={async () => {
              connectionState === ConnectionState.ONLINE ? client.mesh.goOffline() : client.mesh.goOnline();
            }}
          >
            Toggle
          </Button>
        </>
      )}
    </div>
  );
};
