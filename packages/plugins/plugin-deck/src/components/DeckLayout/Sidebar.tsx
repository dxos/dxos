//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type LayoutParts, Surface } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';

import { useLayout } from '../LayoutContext';

export type SidebarProps = {
  layoutParts: LayoutParts;
};

export const Sidebar = ({ layoutParts }: SidebarProps) => {
  const { popoverAnchorId } = useLayout();
  const navigationData = useMemo(() => ({ popoverAnchorId }), [popoverAnchorId]);

  return (
    <Main.NavigationSidebar>
      <Surface role='navigation' data={navigationData} limit={1} />
    </Main.NavigationSidebar>
  );
};
