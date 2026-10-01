//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

// Kept out of `Focus.tsx`: react-refresh only fast-refreshes a module whose exports are all components.

/** A state a member reports to its group, shown as the group's ring colour. */
export type FocusState = 'active' | 'error';

export type FocusContextValue = {
  /** Called by a member (e.g. a drop target) to colour the group's ring. */
  setFocus?: (state: FocusState | undefined) => void;
  /** True while any element inside the group has DOM focus. */
  groupHasFocus?: boolean;
};

export const FocusContext = createContext<FocusContextValue>({});

/** The enclosing `Next.Focus.Group`'s state; empty outside one. */
export const useFocus = () => useContext(FocusContext);
