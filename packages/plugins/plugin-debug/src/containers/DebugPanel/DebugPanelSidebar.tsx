//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useEffect, useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useGraphTreeModel } from '@dxos/plugin-graph/hooks';
import { ScrollArea, useTranslation } from '@dxos/react-ui';
import { useManagerOptional } from '@dxos/react-ui-attention';
import { Path, Tree } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { DebugNodes } from '#types';

import { useDebugPanelContext } from './DebugPanelContext.ts';
import { type DebugPanelViewState, debugPanelAspect } from './view-state.ts';

const ROOT_PATH = [DebugNodes.DEBUG_ROOT_ID];

/** The tree over the hidden `root/debug` category: every developer tool, selected here and shown in `Main`. */
export const DebugPanelSidebar = () => {
  const { t } = useTranslation(meta.profile.key);
  const { contextId, open, select, setOpen } = useDebugPanelContext();
  const { graph } = useAppGraph();
  const manager = useManagerOptional();
  // The model reads state through atoms; the manager's atom for this context is that state, and a
  // host without a ViewStateProvider (a bare story) gets an in-memory one.
  const stateAtom = useMemo(
    () => manager?.atom(debugPanelAspect, contextId) ?? Atom.make<DebugPanelViewState>({ open: [] }),
    [manager, contextId],
  );
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

  useEffect(() => {
    AppGraph.expandSync(graph, DebugNodes.DEBUG_ROOT_ID, 'child');
  }, [graph]);

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
