//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Banner } from './Banner';
import { useBreakpoints } from '../../util';
import { useLayout } from '../LayoutContext';

export const Sidebar = () => {
  const layoutContext = useLayout();
  const { popoverAnchorId } = layoutContext;
  const breakpoint = useBreakpoints();

  const navigationData = useMemo(() => ({ popoverAnchorId }), [popoverAnchorId]);

  return (
    <Main.NavigationSidebar classNames='grid grid-cols-1 grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content_min-content] md:grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content] lg:grid-rows-[var(--rail-action)_1fr_min-content] overflow-hidden lg:block-start-[--rail-size]'>
      {breakpoint !== 'desktop' && <Banner variant='sidebar' />}
      <Surface role='search-input' limit={1} />
      <div role='none' className={mx('!overflow-y-auto', breakpoint !== 'desktop' && 'border-be border-separator')}>
        <Surface role='navigation' data={navigationData} limit={1} />
      </div>
      {breakpoint !== 'desktop' && <Surface role='status-bar--sidebar-footer' limit={1} />}
    </Main.NavigationSidebar>
  );
};
