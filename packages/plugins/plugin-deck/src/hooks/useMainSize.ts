//
// Copyright 2024 DXOS.org
//

import { useMainContext } from '@dxos/react-ui';

export const useMainSize = () => {
  const { navigationSidebarOpen, complementarySidebarOpen } = useMainContext('DeckPluginPlank');
  return {
    'data-sidebar-inline-start-state': navigationSidebarOpen ? 'open' : 'closed',
    'data-sidebar-inline-end-state': complementarySidebarOpen ? 'open' : 'closed',
  };
};
