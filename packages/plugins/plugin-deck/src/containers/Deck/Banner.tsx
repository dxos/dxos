//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import type * as Util from '@dxos/react-ui/Util';
import { mx, osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import { DeckRole } from '#types';

import { CloseSidebarButton, ToggleSidebarButton } from '../Sidebar/index.ts';

export const Banner = ({ variant, classNames }: Util.ThemedClassName<{ variant?: 'topbar' | 'sidebar' }>) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

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
        <div className='dx-cover pointer-events-none'>
          <Layout.Grid classNames='h-full pointer-fine:p-1 max-w-md mx-auto pointer-events-auto'>
            <Surface.Surface type={AppSurface.SearchInput} limit={1} />
          </Layout.Grid>
        </div>
      )}
      <span className='grow' />
      <Surface.Surface type={DeckRole.VersionInfo} limit={1} />
    </header>
  );
};

Banner.displayName = 'Banner';
