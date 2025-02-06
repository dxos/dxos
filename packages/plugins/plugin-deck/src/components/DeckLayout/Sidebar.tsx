//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';

import { Banner } from './Banner';
import { layoutAppliesTopbar, useBreakpoints } from '../../util';
import { useHoistStatusbar } from '../../util/useHoistStatusbar';
import { useLayout } from '../LayoutContext';

export const Sidebar = () => {
  const layoutContext = useLayout();
  const { popoverAnchorId } = layoutContext;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);
  const hoistStatusbar = useHoistStatusbar(breakpoint);

  const navigationData = useMemo(() => ({ popoverAnchorId }), [popoverAnchorId]);

  return (
    <Main.NavigationSidebar
      classNames={[
        'grid grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content_min-content] md:grid-rows-[var(--rail-size)_var(--rail-action)_1fr_min-content]',
        topbar && 'grid-rows-[1fr_min-content] block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]',
      ]}
    >
      {!topbar && (
        <>
          <Banner variant='sidebar' />
          <Surface role='search-input' limit={1} />
        </>
      )}
      <Surface role='navigation' data={navigationData} limit={1} />
      {!hoistStatusbar && <Surface role='status-bar--sidebar-footer' limit={1} />}
    </Main.NavigationSidebar>
  );
};
