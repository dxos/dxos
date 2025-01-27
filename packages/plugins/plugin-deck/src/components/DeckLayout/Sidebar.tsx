//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { IconButton, Main, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { DECK_PLUGIN } from '../../meta';
import { useLayout } from '../LayoutContext';

export const Sidebar = () => {
  const layoutContext = useLayout();
  const { t } = useTranslation(DECK_PLUGIN);
  const { popoverAnchorId } = layoutContext;
  const [isLg] = useMediaQuery('lg');

  const navigationData = useMemo(() => ({ popoverAnchorId }), [popoverAnchorId]);

  return (
    <Main.NavigationSidebar classNames='grid grid-cols-1 grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content_min-content] md:grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content] overflow-hidden'>
      <header className='border-be border-separator flex items-stretch'>
        <IconButton
          variant='ghost'
          iconOnly
          icon='ph--caret-line-left--regular'
          size={4}
          label={t('close navigation sidebar label')}
          onClick={() => (layoutContext.sidebarOpen = !layoutContext.sidebarOpen)}
          classNames='!rounded-none ch-focus-ring-inset pie-[max(.5rem,env(safe-area-inset-left))]'
        />
        <span className='self-center grow mis-1'>Composer</span>
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
