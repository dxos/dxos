//
// Copyright 2026 DXOS.org
//

import { createContext } from '@dxos/react-hooks';

// Kept out of `Drawer.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const DRAWER_NAME = 'Drawer';

export type DrawerContextValue = {
  /** The panel takes part in the page's layout and pushes its neighbours, rather than floating over them. */
  push: boolean;
  /** The drawer was open when its root first rendered and has not closed since: it is simply there, no entrance. */
  instant: boolean;
  /** Pushed: how long an open or close takes, in milliseconds. */
  transition: number;
};

export const [DrawerProvider, useDrawerContext] = createContext<DrawerContextValue>(DRAWER_NAME);
