//
// Copyright 2025 DXOS.org
//

import { type Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useContext, useEffect, useRef } from 'react';

import { Graph, Node } from '@dxos/app-graph';

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

  // Create graph once, then update it when props change.
  const graphRef = useRef<Graph.WritableGraph | null>(null);
  if (!graphRef.current) {
    graphRef.current = Graph.make({
      registry,
      nodes: menuGraphProps.nodes as Node.Node[],
      edges: edgesArrayToRecord(menuGraphProps.edges),
    });
  }
  const graph = graphRef.current;

  // Update graph nodes when props change (after render completes).
  const prevPropsRef = useRef(menuGraphProps);
  useEffect(() => {
    if (prevPropsRef.current !== menuGraphProps) {
      prevPropsRef.current = menuGraphProps;
      graph.pipe(Graph.addNodes(menuGraphProps.nodes), Graph.addEdges(menuGraphProps.edges));
    }
  }, [graph, menuGraphProps]);

  const useGroupItems = useCallback(
    (sourceNode?: MenuItemGroup) => {
      const items = useAtomValue(graph.connections(sourceNode?.id || Node.RootId)) as MenuItem[];
      return items;
    },
    [graph],
  );

  return { useGroupItems };
};
