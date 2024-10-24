//
// Copyright 2023 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { type PropsWithChildren, type ReactNode } from 'react';

import { useConfig } from '@dxos/react-client';

export const DebugPanel = ({ menu, children }: PropsWithChildren<{ menu: ReactNode }>) => {
  const config = useConfig();
  return (
    <>
      <div className='flex shrink-0 p-2 space-x-2'>{menu}</div>
      <div className='flex flex-col grow px-2 overflow-hidden'>
        <div className='flex flex-col grow overflow-auto'>{children}</div>
        {config.values?.runtime?.app?.build?.timestamp && (
          <div className='p-2 text-sm font-mono'>
            {config.values?.runtime?.app?.build?.version}
            {formatDistance(new Date(config.values?.runtime?.app?.build?.timestamp), new Date(), {
              addSuffix: true,
              includeSeconds: true,
            })}
          </div>
        )}
      </div>
    </>
  );
};
