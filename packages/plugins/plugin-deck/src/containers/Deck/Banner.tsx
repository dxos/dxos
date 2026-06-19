//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx, osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import { VersionInfo } from '#types';

import { CloseSidebarButton, ToggleSidebarButton } from '../Sidebar';

export const Banner = ({ variant, classNames }: ThemedClassName<{ variant?: 'topbar' | 'sidebar' }>) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <header
      className={mx(
        'flex items-stretch relative py-1 ps-1 pe-2',
        variant === 'topbar' &&
          'fixed inset-x-0 top-[env(safe-area-inset-top)] h-(--dx-rail-size) border-b border-separator',
        classNames,
      )}
    >
      {variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}
      <span className='self-center grow ms-1'>{t('current-app.name', { ns: osTranslations })}</span>
      {variant === 'topbar' && (
        <div className='absolute inset-0 pointer-events-none'>
          <div className='grid h-full pointer-fine:p-1 max-w-md mx-auto pointer-events-auto'>
            <Surface.Surface type={AppSurface.SearchInput} limit={1} />
          </div>
        </div>
      )}
      <span className='grow' />
      <Surface.Surface type={VersionInfo} limit={1} />
    </header>
  );
};
