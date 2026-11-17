//
// Copyright 2026 DXOS.org
//

import type * as Main from '@dxos/react-ui/Main';

import { useDeckCompanions } from './useDeckCompanions.ts';

export const useComplementarySidebarState = (state: Main.SidebarState, fullscreen?: boolean): Main.SidebarState => {
  const companions = useDeckCompanions();
  return fullscreen || companions.length === 0 ? 'closed' : state;
};
