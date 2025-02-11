//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';

import { layoutAppliesTopbar, useBreakpoints } from '../../util';
import { useHoistStatusbar } from '../../util/useHoistStatusbar';
import { useLayout } from '../LayoutContext';

export const Sidebar = () => {
  const { popoverAnchorId, activeDeck: current } = useLayout();
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint);
  const hoistStatusbar = useHoistStatusbar(breakpoint);

  const navigationData = useMemo(
    () => ({ popoverAnchorId, topbar, hoistStatusbar, current }),
    [popoverAnchorId, topbar, hoistStatusbar, current],
  );

  return (
    <Main.NavigationSidebar
      classNames={['grid', topbar && 'block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]']}
    >
      <Surface role='navigation' data={navigationData} limit={1} />
    </Main.NavigationSidebar>
  );
};
