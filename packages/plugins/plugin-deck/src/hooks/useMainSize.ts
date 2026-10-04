//
// Copyright 2024 DXOS.org
//

import { type MainSidebarState, useMainSidebars } from '@dxos/react-ui';

export const useMainSize = (): Record<'data-sidebar-left-state' | 'data-sidebar-right-state', MainSidebarState> => {
  const { navigationSidebarState, complementarySidebarState } = useMainSidebars('DeckPluginPlank');
  return {
    'data-sidebar-left-state': navigationSidebarState,
    'data-sidebar-right-state': complementarySidebarState,
  };
};
