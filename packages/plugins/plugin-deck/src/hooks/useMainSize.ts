//
// Copyright 2024 DXOS.org
//

import * as Main from '@dxos/react-ui/Main';

export const useMainSize = (): Record<'data-sidebar-left-state' | 'data-sidebar-right-state', Main.SidebarState> => {
  const { navigationSidebarState, complementarySidebarState } = Main.useMainSidebars('DeckPluginPlank');
  return {
    'data-sidebar-left-state': navigationSidebarState,
    'data-sidebar-right-state': complementarySidebarState,
  };
};
