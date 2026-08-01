//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Label, Main } from '@dxos/react-ui';

import { useBreakpoints, useDeckState } from '#hooks';
import { meta } from '#meta';
import { getMode } from '#types';

import { layoutAppliesTopbar } from '../../util';

const label = ['sidebar.title', { ns: meta.profile.key }] satisfies Label;

export const Sidebar = () => {
  const { state, deck } = useDeckState();
  const { popoverAnchorId, activeDeck: current } = state;
  const breakpoint = useBreakpoints();
  const layoutMode = getMode(deck);
  const topbar = layoutAppliesTopbar(breakpoint, layoutMode);

  const navigationData = useMemo<AppSurface.NavigationData<{ topbar: boolean }>>(
    () => ({ popoverAnchorId, topbar, current }),
    [popoverAnchorId, topbar, current],
  );

  return (
    <Main.NavigationSidebar
      label={label}
      classNames={['grid', topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]']}
    >
      <Surface.Surface type={AppSurface.Navigation} data={navigationData} limit={1} />
    </Main.NavigationSidebar>
  );
};

Sidebar.displayName = 'Sidebar';
