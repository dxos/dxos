//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type Label, Main } from '@dxos/react-ui';

import { useBreakpoints, useDeckState, useHoistStatusbar } from '../../hooks';
import { meta } from '../../meta';
import { getMode } from '../../types';
import { layoutAppliesTopbar } from '../../util';

const label = ['sidebar title', { ns: meta.id }] satisfies Label;

export const Sidebar = () => {
  const { state, deck } = useDeckState();
  const { popoverAnchorId, activeDeck: current } = state;
  const breakpoint = useBreakpoints();
  const layoutMode = getMode(deck);
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);
  const hoistStatusbar = useHoistStatusbar(breakpoint, layoutMode);

  const navigationData = useMemo(
    () => ({ popoverAnchorId, topbar, hoistStatusbar, current }),
    [popoverAnchorId, topbar, hoistStatusbar, current],
  );

  return (
    <Main.NavigationSidebar
      label={label}
      classNames={[
        'grid',
        topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]',
        hoistStatusbar && 'bottom-(--dx-statusbar-size)',
      ]}
    >
      <Surface.Surface role='navigation' data={navigationData} limit={1} />
    </Main.NavigationSidebar>
  );
};
