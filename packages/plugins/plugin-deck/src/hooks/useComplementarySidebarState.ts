//
// Copyright 2026 DXOS.org
//

import type * as Main from '@dxos/react-ui/Main';

import { useDeckCompanions } from './useDeckCompanions.ts';

/** The complementary sidebar's state as laid out: closed in fullscreen, and when no companion is contributed. */
export const useComplementarySidebarState = (state: Main.SidebarState, fullscreen?: boolean): Main.SidebarState => {
  const companions = useDeckCompanions();
  return fullscreen || companions.length === 0 ? 'closed' : state;
};
