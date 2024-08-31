//
// Copyright 2023 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { type FC, type PropsWithChildren, type ReactNode } from 'react';

import { useConfig } from '@dxos/react-client';
import { DensityProvider } from '@dxos/react-ui';

export const DebugPanel: FC<PropsWithChildren<{ menu: ReactNode }>> = ({ menu, children }) => {
  const config = useConfig();
  return (
    <>
      <div className='flex shrink-0 space-x-2 p-2'>
        <DensityProvider density='fine'>{menu}</DensityProvider>
      </div>
      <div className='flex grow flex-col overflow-hidden px-2'>
        <div className='flex grow flex-col overflow-auto'>{children}</div>

        {config.values?.runtime?.app?.build?.timestamp && (
          <div className='p-2 font-mono text-sm'>
            {config.values?.runtime?.app?.build?.version} (
            {formatDistance(new Date(config.values?.runtime?.app?.build?.timestamp), new Date(), {
              addSuffix: true,
              includeSeconds: true,
            })}
            )
          </div>
        )}
      </div>
    </>
  );
};
