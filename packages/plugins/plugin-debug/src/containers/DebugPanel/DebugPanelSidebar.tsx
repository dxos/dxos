//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useGraphTreeModel } from '@dxos/plugin-graph/hooks';
import { ScrollArea, useTranslation } from '@dxos/react-ui';
import { useManager } from '@dxos/react-ui-attention';
import { Path, Tree } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { DebugNodes } from '#types';

import { useDebugPanelContext } from './DebugPanelContext.ts';
import { debugPanelAspect } from './view-state.ts';

const ROOT_PATH = [DebugNodes.DEBUG_ROOT_ID];

/** The node and every ancestor under the debug root, so each level's connector runs. */
const lineage = (nodeId: string): string[] => {
  const segments = nodeId.split('/');
  return segments
    .map((_, index) => segments.slice(0, index + 1).join('/'))
    .filter((id) => id.startsWith(DebugNodes.DEBUG_ROOT_ID));
};

/** Page ids the panel persisted before the pages lived under the Debug node. */
const LEGACY_PAGE_IDS: Record<string, string> = {
  [`${DebugNodes.DEBUG_ROOT_ID}/${DebugNodes.nodeId(DebugNodes.Console)}`]: DebugNodes.CONSOLE_NODE_ID,
  [`${DebugNodes.DEBUG_ROOT_ID}/${DebugNodes.nodeId(DebugNodes.Logs)}`]: DebugNodes.LOGS_NODE_ID,
};

/** The tree over the hidden `root/debug` category: every developer tool, selected here and shown in `Main`. */
export const DebugPanelSidebar = () => {
  const { t } = useTranslation(meta.profile.key);
  const { contextId, nodeId, open, select, setOpen } = useDebugPanelContext();
  const { graph } = useAppGraph();
  const manager = useManager();
  // The model reads state through atoms, and the manager's atom for this context is that state.
  const stateAtom = useMemo(() => manager.atom(debugPanelAspect, contextId), [manager, contextId]);
  const state = useMemo(
    () => ({
      itemOpen: (path: string[]) =>
        Atom.make((get) => get(stateAtom).open.includes(Path.create(...path))).pipe(Atom.keepAlive),
      itemCurrent: (path: string[]) =>
        Atom.make((get) => get(stateAtom).nodeId === path[path.length - 1]).pipe(Atom.keepAlive),
    }),
    [stateAtom],
  );
  const model = useGraphTreeModel(DebugNodes.DEBUG_ROOT_ID, state);

  // Persisted state names nodes whose children come from connectors that only run on expansion, so
  // without this an open branch restores empty and a nested selection restores to a blank page. A
  // pristine panel opens on the console, as it did when the console was its first tab. The latest
  // state is read through a ref so the restore runs once per context, not on every change.
  const latestRef = useRef({ open, nodeId });
  latestRef.current = { open, nodeId };
  useEffect(() => {
    AppGraph.expandSync(graph, DebugNodes.DEBUG_ROOT_ID, 'child');
    const { open, nodeId } = latestRef.current;
    if (!nodeId && open.length === 0) {
      setOpen(Path.create(DebugNodes.DEBUG_ROOT_ID, contextId, DebugNodes.DEBUG_NODE_ID), true);
      select(DebugNodes.CONSOLE_NODE_ID);
    }
    // The console and logs pages moved under the Debug node; a selection persisted at their old
    // top-level ids is carried to the new ones.
    const legacy = nodeId ? LEGACY_PAGE_IDS[nodeId] : undefined;
    if (legacy) {
      select(legacy);
    }
    for (const key of open) {
      AppGraph.expandSync(graph, Path.last(key), 'child');
    }
    for (const id of lineage(legacy ?? nodeId ?? DebugNodes.CONSOLE_NODE_ID)) {
      AppGraph.expandSync(graph, id, 'child');
    }
  }, [graph, contextId, select, setOpen]);

  const handleOpenChange = useCallback(
    ({ item, path, open }: { item: AppGraphNode.Node; path: string[]; open: boolean }) => {
      setOpen(Path.create(...path), open);
      AppGraph.expandSync(graph, item.id, 'child');
    },
    [graph, setOpen],
  );

  const handleSelect = useCallback(
    ({ item, path }: { item: AppGraphNode.Node; path: string[] }) => {
      if (item.data === null) {
        // A branch has no page: selecting it toggles it.
        const key = Path.create(...path);
        setOpen(key, !open.includes(key));
        AppGraph.expandSync(graph, item.id, 'child');
        return;
      }
      select(item.id);
      AppGraph.expandSync(graph, item.id, 'child');
    },
    [graph, open, select, setOpen],
  );

  return (
    <ScrollArea.Root thin orientation='vertical'>
      <ScrollArea.Viewport>
        <Tree
          id={contextId}
          rootId={DebugNodes.DEBUG_ROOT_ID}
          path={ROOT_PATH}
          ariaLabel={t('debug-panel.tree.label')}
          model={model}
          density='sm'
          onOpenChange={handleOpenChange}
          onSelect={handleSelect}
        />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

DebugPanelSidebar.displayName = 'DebugPanel.Sidebar';
