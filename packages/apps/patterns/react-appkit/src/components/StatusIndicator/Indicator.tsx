//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Tooltip, useTranslation, valenceColorText, mx } from '@dxos/react-components';

// TODO(burdon): Extend to show heartbeat, network status, etc.
// TODO(burdon): Merge with ErrorBoundary indicator since overlaps.
export const Indicator = ({ status }: { status: boolean }) => {
  const { t } = useTranslation('appkit');
  return (
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
  );
};
