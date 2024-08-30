//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type Attention, type LayoutParts, openIds, Surface } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';

import { useLayout } from '../LayoutContext';

export type SidebarProps = {
  attention: Attention;
  layoutParts: LayoutParts;
};

export const Sidebar = ({ attention, layoutParts }: SidebarProps) => {
  const { layoutMode, popoverAnchorId } = useLayout();

  const activeIds = useMemo(() => {
    if (layoutMode === 'solo') {
      return new Set<string>(layoutParts?.solo?.map((e) => e.id) ?? []);
    } else if (layoutMode === 'deck') {
      return new Set<string>(layoutParts?.main?.map((e) => e.id) ?? []);
    }

    return new Set<string>(openIds(layoutParts));
  }, [layoutParts, layoutMode]);

  const navigationData = useMemo(
    () => ({
      popoverAnchorId,
      activeIds,
      attended: attention.attended,
    }),
    [popoverAnchorId, activeIds, attention.attended],
  );
  return (
    <Main.NavigationSidebar>
      <Surface role='navigation' data={{ ...navigationData }} limit={1} />
    </Main.NavigationSidebar>
  );
};
