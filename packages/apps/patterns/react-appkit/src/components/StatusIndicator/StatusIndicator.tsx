//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { NetworkMode } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkMode } from '@dxos/react-client';
import { Tooltip, useTranslation, valenceColorText, mx } from '@dxos/react-components';

// TODO(burdon): Extend to show heartbeat, network status, etc.
// TODO(burdon): Merge with ErrorBoundary indicator since overlaps.
export const StatusIndicator = ({ status }: { status: boolean }) => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const networkMode = useNetworkMode();
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
      {networkMode && (
        <>
          {' '}
          <span className='ml-2'>{networkMode.mode === 0 ? 'OFFLINE' : 'ONLINE'}</span>
          <Button
            onClick={async () => {
              const newMode = networkMode.mode === NetworkMode.OFFLINE ? NetworkMode.ONLINE : NetworkMode.OFFLINE;
              await client.setNetworkMode(newMode);
            }}
          >
            Toggle
          </Button>
        </>
      )}
    </div>
  );
};
