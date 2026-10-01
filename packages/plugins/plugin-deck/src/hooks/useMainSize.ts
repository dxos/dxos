//
// Copyright 2024 DXOS.org
//

import { Next } from '@dxos/react-ui';

export const useMainSize = (): Record<
  'data-sidebar-left-state' | 'data-sidebar-right-state',
  Next.MainSidebarState
> => {
  const { navigationSidebarState, complementarySidebarState } = Next.useMainSidebars('DeckPluginPlank');
  return {
    'data-sidebar-left-state': navigationSidebarState,
    'data-sidebar-right-state': complementarySidebarState,
  };
};
