//
// Copyright 2024 DXOS.org
//

import { useMainContext } from '@dxos/react-ui';

export const useMainSize = () => {
  const { navigationSidebarState, complementarySidebarState } = useMainContext('DeckPluginPlank');
  return {
    'data-sidebar-left-state': navigationSidebarState,
    'data-sidebar-right-state': complementarySidebarState,
  };
};
