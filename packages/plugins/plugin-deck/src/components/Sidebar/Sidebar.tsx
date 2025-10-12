//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useCapability } from '@dxos/app-framework';
import { type Label, Main } from '@dxos/react-ui';

import { DeckCapabilities } from '../../capabilities';
import { useBreakpoints, useHoistStatusbar } from '../../hooks';
import { meta } from '../../meta';
import { getMode } from '../../types';
import { layoutAppliesTopbar } from '../../util';

const label = ['sidebar title', { ns: meta.id }] satisfies Label;

export const Sidebar = () => {
  const { popoverAnchorId, activeDeck: current, deck } = useCapability(DeckCapabilities.DeckState);
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
        topbar && 'block-start-[calc(env(safe-area-inset-top)+var(--rail-size))]',
        hoistStatusbar && 'block-end-[--statusbar-size]',
      ]}
    >
      <Surface role='navigation' data={navigationData} limit={1} />
    </Main.NavigationSidebar>
  );
};
