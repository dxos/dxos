import { createContext } from '@dxos/react-hooks';
//
// Copyright 2025 DXOS.org
//

// Kept out of `MobileLayout.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const MOBILE_LAYOUT_NAME = 'MobileLayout';

//
// Context
//

export type MobileLayoutContextValue = {
  keyboardOpen: boolean;
};

export const [MobileLayoutProvider, useMobileLayout] = createContext<MobileLayoutContextValue>(MOBILE_LAYOUT_NAME);
