//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

// Kept out of `Focus.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type FocusState = 'active' | 'error';

export const FOCUS_STATE_ATTR = 'focus-state';

export type ContextValue = {
  setFocus?: (state: FocusState | undefined) => void;
  /** True when any item within the group has DOM focus. */
  groupHasFocus?: boolean;
};

export const FocusContext = createContext<ContextValue>({});

export const useFocus = () => useContext(FocusContext);
