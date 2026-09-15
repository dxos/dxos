//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { type DebugPanelMode } from './view-state.ts';

// Kept out of `DebugPanel.tsx`: the sidebar and main parts read the context the root provides, and
// a module importing its own importers is a cycle.

export type DebugPanelContextValue = {
  contextId: string;
  /** Qualified id of the selected page. */
  nodeId?: string;
  /** Joined paths of the expanded branches. */
  open: readonly string[];
  /** Where the panel is hosted; the hosts read it to decide which of them shows. */
  mode: DebugPanelMode;
  select: (nodeId: string) => void;
  setOpen: (pathKey: string, open: boolean) => void;
  setMode: (mode: DebugPanelMode) => void;
};

export const DebugPanelContext = createContext<DebugPanelContextValue | null>(null);

export const useDebugPanelContext = (): DebugPanelContextValue => {
  const value = useContext(DebugPanelContext);
  if (!value) {
    throw new Error('Missing DebugPanelContext');
  }
  return value;
};
