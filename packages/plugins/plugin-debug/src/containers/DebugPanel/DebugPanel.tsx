//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { Splitter } from '@dxos/react-ui';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';

import { DebugPanelContext, type DebugPanelContextValue } from './DebugPanelContext.ts';
import { DebugPanelMain } from './DebugPanelMain.tsx';
import { DebugPanelSidebar } from './DebugPanelSidebar.tsx';
import { DEBUG_PANEL_CONTEXT, type DebugPanelMode, debugPanelAspect } from './view-state.ts';

export type DebugPanelRootProps = PropsWithChildren<{
  /** Overridable so a second host (or a story) gets its own selection rather than the rail's. */
  contextId?: string;
}>;

/**
 * The debug surface in parts, so a host places the tree and the page where the room is — the
 * floating window and the deck's drawer both split them under a title bar. `Root` owns the
 * selection, the expanded branches and the mode, persisted so a debugging session survives the
 * reloads it provokes.
 */
const DebugPanelRoot = ({ contextId = DEBUG_PANEL_CONTEXT, children }: DebugPanelRootProps) => {
  const { nodeId, open, mode = 'docked' } = useViewState(debugPanelAspect, contextId);
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
  const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ...prev, mode })), [update]);
  const value = useMemo<DebugPanelContextValue>(
    () => ({ contextId, nodeId, open, mode, select, setOpen, setMode }),
    [contextId, nodeId, open, mode, select, setOpen, setMode],
  );

  return <DebugPanelContext.Provider value={value}>{children}</DebugPanelContext.Provider>;
};

DebugPanelRoot.displayName = 'DebugPanel.Root';

/** The tree's opening width (rem): a navtree sidebar's, so tool labels read at the scale they do there. */
const SIDEBAR_SIZE = 16;

/** The tree beside the selected tool's page, split the same way in every host. */
const DebugPanelBody = () => (
  <Splitter.Root orientation='horizontal' anchor='start' resizable defaultSize={SIDEBAR_SIZE} minSize={8}>
    <Splitter.Panel position='start'>
      <DebugPanelSidebar />
    </Splitter.Panel>
    <Splitter.Handle />
    <Splitter.Panel position='end'>
      <DebugPanelMain />
    </Splitter.Panel>
  </Splitter.Root>
);

DebugPanelBody.displayName = 'DebugPanel.Body';

export const DebugPanel = {
  Root: DebugPanelRoot,
  Body: DebugPanelBody,
  Sidebar: DebugPanelSidebar,
  Main: DebugPanelMain,
};
