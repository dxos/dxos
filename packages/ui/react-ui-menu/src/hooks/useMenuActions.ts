//
// Copyright 2025 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type DependencyList, useCallback, useContext, useMemo } from 'react';

import { Graph, Node } from '@dxos/app-graph';

import { type MenuItem, type MenuItemGroup, type MenuItemsAccessor } from '../types';

export type ActionGraphNodes = Node.NodeArg<any>[];
export type ActionGraphEdges = Graph.Edge[];
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
  // (Graph.addEdges appends rather than replaces, which breaks ordering on updates.)
  // NOTE: Using useMemo rather than a ref-mutation pattern to avoid calling registry.set during render,
  // which would trigger atom state updates in other components (setState-in-render React warning).
  const graph = useMemo(() => {
    const newGraph = Graph.make({ registry });
    newGraph.pipe(Graph.addNodes(menuGraphProps.nodes as Node.NodeArg<any>[]), Graph.addEdges(menuGraphProps.edges));
    return newGraph;
  }, [registry, menuGraphProps]);

  const items: MenuItemsAccessor = useCallback(
    (group?: MenuItemGroup) => {
      // TODO(wittjosiah): Migrate to using action relation instead of child.
      return graph.connections(group?.id || Node.RootId, 'child') as Atom.Atom<MenuItem[] | null>;
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
 * IMPORTANT — make the toolbar reactive via `get`, not via `deps`. Read every piece of state that
 * the actions depend on (echo objects, atoms, derived values) through the `get` argument *inside*
 * the builder: `(get) => { const value = get(someAtom); ... }`. The action graph then subscribes to
 * those atoms and rebuilds itself the instant they change. Do NOT flatten reactive state into static
 * props/values and list them in `deps` to force a rebuild — that reintroduces React-render-driven
 * updates and defeats the point of the idiom. `deps` should hold only stable references (the atoms
 * themselves, callbacks, config), never the live values. See `EditorToolbar` for the canonical usage.
 */
export const useMenuBuilder = (build: (get: Atom.Context) => ActionGraphProps, deps: DependencyList): MenuActions => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const atom = useMemo(() => Atom.make(build), deps);
  return useMenuActions(atom);
};
