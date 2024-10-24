//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type LayoutParts, openIds, Surface } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';

import { useLayout } from '../LayoutContext';

export type SidebarProps = {
  layoutParts: LayoutParts;
};

export const Sidebar = ({ layoutParts }: SidebarProps) => {
  const { layoutMode, popoverAnchorId } = useLayout();

  // TODO(wittjosiah): The activeIds should be path-based to avoid conflicts.
  const activeIds = useMemo(() => {
    if (layoutMode === 'solo') {
      return Array.from(new Set<string>(layoutParts?.solo?.map((e) => e.id) ?? []));
    } else if (layoutMode === 'deck') {
      return Array.from(new Set<string>(layoutParts?.main?.map((e) => e.id) ?? []));
    }

    return Array.from(new Set<string>(openIds(layoutParts)));
  }, [layoutParts, layoutMode]);

  const navigationData = useMemo(
    () => ({
      popoverAnchorId,
      activeIds,
    }),
    [popoverAnchorId, activeIds],
  );
  return (
    <Main.NavigationSidebar>
      <Surface role='navigation' data={{ ...navigationData }} limit={1} />
    </Main.NavigationSidebar>
  );
};
