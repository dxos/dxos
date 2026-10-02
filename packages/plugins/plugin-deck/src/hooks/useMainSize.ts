//
// Copyright 2024 DXOS.org
//

import * as Main from '@dxos/react-ui/Main';

export const useMainSize = () => {
  const { navigationSidebarState, complementarySidebarState } = Main.useMainContext('DeckPluginPlank');
  return {
    'data-sidebar-left-state': navigationSidebarState,
    'data-sidebar-right-state': complementarySidebarState,
  };
};
