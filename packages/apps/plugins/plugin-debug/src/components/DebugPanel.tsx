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

export const DebugPanel: FC<PropsWithChildren<{ role: 'main' | 'article'; menu: ReactNode }>> = ({
  role,
  menu,
  children,
}) => {
  const config = useConfig();
  return (
    <MainOrArticle role={role}>
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
    </MainOrArticle>
  );
};

const MainOrArticle: FC<PropsWithChildren<{ role: 'main' | 'article' }>> = ({ role, children }) => {
  return role === 'main' ? (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      {children}
    </Main.Content>
  ) : (
    <div role='none' className='row-span-2 rounded-t-md overflow-x-auto'>
      {children}
    </div>
  );
};
