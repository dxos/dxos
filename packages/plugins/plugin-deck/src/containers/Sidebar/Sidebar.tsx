//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Main from '@dxos/react-ui/Main';
import type * as Theme from '@dxos/react-ui/Theme';

import { useBreakpoints, useDeckState } from '#hooks';
import { meta } from '#meta';

import { layoutAppliesTopbar } from '../../util/index.ts';

const label = ['sidebar.title', { ns: meta.profile.key }] satisfies Theme.Label;

export const Sidebar = () => {
  const { state } = useDeckState();
  const { popoverAnchorId, activeDeck: current, fullscreen } = state;
  const breakpoint = useBreakpoints();
  const topbar = layoutAppliesTopbar(breakpoint, !!fullscreen);

  const navigationData = useMemo<AppSurface.NavigationData<{ topbar: boolean }>>(
    () => ({ popoverAnchorId, topbar, current }),
    [popoverAnchorId, topbar, current],
  );

  return (
    <Main.NavigationSidebar
      // The navigation surface declares its rail and panel as focus areas of their own.
      landmark={false}
      data-testid='deck.sidebar'
      label={label}
      classNames={['grid', topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size))]']}
    >
      <Surface.Surface type={AppSurface.Navigation} data={navigationData} limit={1} />
    </Main.NavigationSidebar>
  );
};

Sidebar.displayName = 'Sidebar';
