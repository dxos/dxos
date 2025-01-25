//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Main, useMediaQuery } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useLayout } from '../LayoutContext';

export const Sidebar = () => {
  const { popoverAnchorId } = useLayout();
  const [isLg] = useMediaQuery('lg');

  const navigationData = useMemo(() => ({ popoverAnchorId }), [popoverAnchorId]);

  return (
    <Main.NavigationSidebar classNames='grid grid-cols-1 grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content_min-content] md:grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content] overflow-hidden'>
      <header className='border-be border-separator flex items-center pis-2'>
        <span className='grow '>Composer</span>
        <Surface role='header-end' limit={1} />
      </header>
      <Surface role='search-input' limit={1} />
      <div role='none' className={mx('!overflow-y-auto', !isLg && 'border-be border-separator')}>
        <Surface role='navigation' data={navigationData} limit={1} />
      </div>
      {!isLg && <Surface role='status-bar--sidebar-footer' limit={1} />}
    </Main.NavigationSidebar>
  );
};
