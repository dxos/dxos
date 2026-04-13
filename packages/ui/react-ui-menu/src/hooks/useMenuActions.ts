//
// Copyright 2025 DXOS.org
//

import { type Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext, useMemo } from 'react';

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
