//
// Copyright 2023 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { type FC, type PropsWithChildren, type ReactNode } from 'react';

import { useConfig } from '@dxos/react-client';
import { DensityProvider, Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

export const DebugPanel: FC<PropsWithChildren<{ menu: ReactNode }>> = ({ menu, children }) => {
  const config = useConfig();
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <div className='flex shrink-0 p-2 space-x-2'>
        <DensityProvider density='fine'>{menu}</DensityProvider>
      </div>
      <div className='flex flex-col grow px-2 overflow-hidden'>
        <div className='flex flex-col grow overflow-auto'>{children}</div>

        {config.values?.runtime?.app?.build?.timestamp && (
          <div className='p-2 text-sm font-mono'>
            {config.values?.runtime?.app?.build?.version} (
            {formatDistance(new Date(config.values?.runtime?.app?.build?.timestamp), new Date(), {
              addSuffix: true,
              includeSeconds: true,
            })}
            )
          </div>
        )}
      </div>
    </Main.Content>
  );
};
