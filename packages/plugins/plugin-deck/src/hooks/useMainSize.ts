//
// Copyright 2024 DXOS.org
//

import { useMainContext } from '@dxos/react-ui';

export const useMainSize = () => {
  const { navigationSidebarState, complementarySidebarOpen } = useMainContext('DeckPluginPlank');
  return {
    'data-sidebar-inline-start-state': navigationSidebarState,
    'data-sidebar-inline-end-state': complementarySidebarOpen ? 'expanded' : 'closed',
  };
};
