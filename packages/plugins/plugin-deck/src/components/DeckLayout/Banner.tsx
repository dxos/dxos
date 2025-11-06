//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/react';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';
import { CloseSidebarButton, ToggleSidebarButton } from '../Sidebar';

export const Banner = ({ variant, classNames }: ThemedClassName<{ variant?: 'topbar' | 'sidebar' }>) => {
  const { t } = useTranslation(meta.id);
  return (
    <header
      className={mx(
        'flex items-stretch relative plb-1 pis-1 pie-2',
        variant === 'topbar' &&
          'fixed inset-inline-0 block-start-[env(safe-area-inset-top)] bs-[--rail-size] border-be border-separator',
        classNames,
      )}
    >
      {variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}
      <span className='self-center grow mis-1'>{t('current app name', { ns: 'appkit' })}</span>
      {variant === 'topbar' && (
        <div role='none' className='absolute inset-0 pointer-events-none'>
          <div role='none' className='grid bs-full pointer-fine:p-1 max-is-md mli-auto pointer-events-auto'>
            <Surface role='search-input' limit={1} />
          </div>
        </div>
      )}
      <span role='none' className='grow' />
      <Surface role='header-end' limit={1} />
      <Surface role='notch-start' limit={1} />
    </header>
  );
};
