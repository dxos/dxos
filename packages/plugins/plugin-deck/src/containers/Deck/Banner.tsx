//
// Copyright 2025 DXOS.org
//

import '@fontsource/poiret-one';

import React from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import type * as Util from '@dxos/react-ui/Util';
import { mx, osTranslations } from '@dxos/ui-theme';

import { DeckCapabilities, DeckSurface } from '#types';

import { DeckNamespace } from '../../namespace.ts';
import { CloseSidebarButton, ToggleSidebarButton } from '../Sidebar/index.ts';

export const Banner = ({ variant, classNames }: Util.ThemedClassName<{ variant?: 'topbar' | 'sidebar' }>) => {
  const { t } = Hooks.useTranslation(DeckNamespace.key);
  const informational = AppHooks.useCapability(DeckCapabilities.Banner);

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
      {informational ? (
        <span
          className='self-center grow ms-1 text-2xl leading-none lowercase relative -top-[0.125em]'
          style={{ fontFamily: 'Poiret One' }}
        >
          {t('current-app.name', { ns: osTranslations })}
        </span>
      ) : (
        <span className='self-center grow ms-1'>{t('current-app.name', { ns: osTranslations })}</span>
      )}
      {variant === 'topbar' && !informational && (
        <div className='dx-cover pointer-events-none'>
          <Layout.Grid classNames='h-full pointer-fine:p-1 max-w-md mx-auto pointer-events-auto'>
            <Surface.Surface type={AppSurface.SearchInput} limit={1} />
          </Layout.Grid>
        </div>
      )}
      <span className='grow' />
      {variant === 'topbar' && <Surface.Surface type={DeckSurface.BannerEnd} />}
      <Surface.Surface type={DeckSurface.VersionInfo} limit={1} />
    </header>
  );
};

Banner.displayName = 'Banner';
