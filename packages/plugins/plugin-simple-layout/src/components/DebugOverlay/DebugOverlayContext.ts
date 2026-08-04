//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

// Kept out of `DebugOverlay.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const DEBUG_OVERLAY_NAME = 'DebugOverlay';

export type DebugOverlayContextValue = {
  /** Log a timestamped message to the on-screen debug overlay. */
  dbg: (msg: string) => void;
};

// Default to a no-op so hooks can call useDebugLog() safely outside of a provider.
export const [DebugOverlayProvider, useDebugLog] = createContext<DebugOverlayContextValue>(DEBUG_OVERLAY_NAME, {
  dbg: () => {},
});
