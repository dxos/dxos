//
// Copyright 2025 DXOS.org
//

import { type Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext, useEffect, useState } from 'react';

import { Graph, type Node } from '@dxos/app-graph';

import { type MenuItem, type MenuItemGroup } from '../types';

const edgesArrayToRecord = (edges: Graph.Edge[]): Record<string, Graph.Edges> => {
  return Object.fromEntries(
    Object.entries(
      edges.reduce((acc: Record<string, { inbound: string[]; outbound: string[] }>, { source, target }) => {
        if (!acc[source]) {
          acc[source] = { inbound: [], outbound: [] };
        }
        if (!acc[target]) {
          acc[target] = { inbound: [], outbound: [] };
        }

        const sourceEdges = acc[source];
        if (!sourceEdges.outbound.includes(target)) {
          sourceEdges.outbound.push(target);
        }

        const targetEdges = acc[target];
        if (!targetEdges.inbound.includes(source)) {
          targetEdges.inbound.push(source);
        }

        return acc;
      }, {}),
    ),
  );
};

export type ActionGraphNodes = Node.NodeArg<any>[];
export type ActionGraphEdges = Graph.Edge[];
export type ActionGraphProps = {
  nodes: ActionGraphNodes;
  edges: ActionGraphEdges;
};

export type MenuActions = {
  useGroupItems: (sourceNode?: MenuItemGroup) => MenuItem[];
};

export const useMenuActions = (props: Atom.Atom<ActionGraphProps>): MenuActions => {
  const registry = useContext(RegistryContext);
  const menuGraphProps = useAtomValue(props);

  const [graph] = useState(
    Graph.make({
      registry,
      nodes: menuGraphProps.nodes as Node.Node[],
      edges: edgesArrayToRecord(menuGraphProps.edges),
    }),
  );

  useEffect(() => {
    graph.pipe(Graph.addNodes(menuGraphProps.nodes), Graph.addEdges(menuGraphProps.edges));
  }, [menuGraphProps]);

  const useGroupItems = useCallback(
    (sourceNode?: MenuItemGroup) => {
      const items = useAtomValue(graph.connections(sourceNode?.id || Graph.ROOT_ID)) as MenuItem[];
      return items;
    },
    [graph],
  );

  return { useGroupItems };
};
