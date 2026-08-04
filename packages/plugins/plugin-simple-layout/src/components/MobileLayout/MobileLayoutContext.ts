//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { MOBILE_LAYOUT_NAME } from './MobileLayout';

// Kept out of `MobileLayout.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

//
// Context
//

export type MobileLayoutContextValue = {
  keyboardOpen: boolean;
};

export const [MobileLayoutProvider, useMobileLayout] = createContext<MobileLayoutContextValue>(MOBILE_LAYOUT_NAME);
