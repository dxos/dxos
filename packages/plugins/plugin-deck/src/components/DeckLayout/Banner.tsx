//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx, osTranslations } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { CloseSidebarButton, ToggleSidebarButton } from '../Sidebar';

export const Banner = ({ variant, classNames }: ThemedClassName<{ variant?: 'topbar' | 'sidebar' }>) => {
  const { t } = useTranslation(meta.id);
  return (
    <header
      className={mx(
        'flex items-stretch relative py-1 pl-1 pr-2',
        variant === 'topbar' &&
          'fixed inset-x-0 top-[env(safe-area-inset-top)] h-(--rail-size) border-b border-separator',
        classNames,
      )}
    >
      {variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}
      <span className='self-center grow ml-1'>{t('current app name', { ns: osTranslations })}</span>
      {variant === 'topbar' && (
        <div role='none' className='absolute inset-0 pointer-events-none'>
          <div role='none' className='grid h-full pointer-fine:p-1 max-w-md mx-auto pointer-events-auto'>
            <Surface.Surface role='search-input' limit={1} />
          </div>
        </div>
      )}
      <span role='none' className='grow' />
      <Surface.Surface role='header-end' limit={1} />
      <Surface.Surface role='notch-start' limit={1} />
    </header>
  );
};
