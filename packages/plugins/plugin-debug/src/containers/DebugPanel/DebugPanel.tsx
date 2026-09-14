//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { DebugPanelContext, type DebugPanelContextValue } from './DebugPanelContext.ts';
import { DebugPanelMain } from './DebugPanelMain.tsx';
import { DebugPanelSidebar } from './DebugPanelSidebar.tsx';
import { DEBUG_PANEL_CONTEXT, debugPanelAspect } from './view-state.ts';

export type DebugPanelRootProps = PropsWithChildren<{
  /** Overridable so a second host (or a story) gets its own selection rather than the rail's. */
  contextId?: string;
}>;

/**
 * The debug surface in parts, so a host places the tree and the page where the room is — the
 * floating window splits them under its title bar. `Root` owns the selection and the expanded
 * branches, persisted so a debugging session survives the reloads it provokes.
 */
const DebugPanelRoot = ({ contextId = DEBUG_PANEL_CONTEXT, children }: DebugPanelRootProps) => {
  const { nodeId, open } = useViewState(debugPanelAspect, contextId);
  const { update } = useViewStateActions(debugPanelAspect, contextId);
  const select = useCallback((nodeId: string) => update((prev) => ({ ...prev, nodeId })), [update]);
  const setOpen = useCallback(
    (pathKey: string, isOpen: boolean) =>
      update((prev) => ({
        ...prev,
        open: isOpen ? [...new Set([...prev.open, pathKey])] : prev.open.filter((key) => key !== pathKey),
      })),
    [update],
  );
  const value = useMemo<DebugPanelContextValue>(
    () => ({ contextId, nodeId, open, select, setOpen }),
    [contextId, nodeId, open, select, setOpen],
  );

  return <DebugPanelContext.Provider value={value}>{children}</DebugPanelContext.Provider>;
};

DebugPanelRoot.displayName = 'DebugPanel.Root';

export const DebugPanel = {
  Root: DebugPanelRoot,
  Sidebar: DebugPanelSidebar,
  Main: DebugPanelMain,
};
