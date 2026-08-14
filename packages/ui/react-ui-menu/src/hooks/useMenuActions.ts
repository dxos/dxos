//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { type DependencyList, useCallback, useContext, useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as GraphNode from '@dxos/graph/GraphNode';

import { type MenuItem, type MenuItemGroup, type MenuItemsAccessor } from '../types';

export type ActionGraphNodes = AppGraphNode.NodeArg<any>[];
export type ActionGraphEdges = AppGraph.Edge[];
export type ActionGraphProps = {
  nodes: ActionGraphNodes;
  edges: ActionGraphEdges;
};

export type MenuActions = {
  items: MenuItemsAccessor;
};

export const useMenuActions = (props: Atom.Atom<ActionGraphProps>): MenuActions => {
  const registry = useContext(RegistryContext);
  const menuGraphProps = useAtomValue(props);

  // Create a new graph whenever props change to preserve correct order.
  // (AppGraph.addEdges appends rather than replaces, which breaks ordering on updates.)
  // NOTE: Using useMemo rather than a ref-mutation pattern to avoid calling registry.set during render,
  // which would trigger atom state updates in other components (setState-in-render React warning).
  const graph = useMemo(() => {
    const newGraph = AppGraph.make({ registry });
    AppGraph.addNodes(newGraph, menuGraphProps.nodes as AppGraphNode.NodeArg<any>[]);
    AppGraph.addEdges(newGraph, menuGraphProps.edges);
    return newGraph;
  }, [registry, menuGraphProps]);

  const items: MenuItemsAccessor = useCallback(
    (group?: MenuItemGroup) => {
      // TODO(wittjosiah): Migrate to using action relation instead of child.
      return graph.connections(group?.id || GraphNode.RootId, 'child') as Atom.Atom<MenuItem[] | null>;
    },
    [graph],
  );

  return { items };
};

/**
 * Convenience wrapper around `useMenuActions` that creates the backing atom inline.
 * Pass a builder thunk and a dependency list — the hook memoizes `Atom.make(build)` and threads
 * it through `useMenuActions`. Saves the `useMemo(() => Atom.make(...), deps)` boilerplate when
 * the action graph is composed from local state (e.g. a toolbar driven by component state).
 *
 * Read reactive state via `get` inside the builder; `deps` should hold only stable references.
 */
export const useMenuBuilder = (
  build: (get: Atom.AtomContext) => ActionGraphProps,
  deps: DependencyList,
): MenuActions => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const atom = useMemo(() => Atom.make(build), deps);
  return useMenuActions(atom);
};
