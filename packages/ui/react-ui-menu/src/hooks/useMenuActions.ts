//
// Copyright 2025 DXOS.org
//

import { RegistryContext, useRxValue } from '@effect-rx/rx-react';
import { useSignalEffect } from '@preact/signals-react';
import { useCallback, useContext, useState } from 'react';

import { type Edge, type Edges, Graph, type NodeArg, type Node, ROOT_ID } from '@dxos/app-graph';

import { type MenuItem, type MenuItemGroup } from '../types';

const edgesArrayToRecord = (edges: Edge[]): Record<string, Edges> => {
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

export type ActionGraphNodes = NodeArg<any>[];
export type ActionGraphEdges = Edge[];
export type ActionGraphProps = { nodes: ActionGraphNodes; edges: ActionGraphEdges };

export const useMenuActions = (actionCreator: () => ActionGraphProps) => {
  const registry = useContext(RegistryContext);
  const initialMenuGraphProps = actionCreator();

  const [graph] = useState(
    new Graph({
      registry,
      nodes: initialMenuGraphProps.nodes as Node[],
      edges: edgesArrayToRecord(initialMenuGraphProps.edges),
    }),
  );

  // TODO(wittjosiah): Remove dependence on signals.
  useSignalEffect(() => {
    const menuGraphProps = actionCreator();
    graph.addNodes(menuGraphProps.nodes);
    graph.addEdges(menuGraphProps.edges);
  });

  const useGroupItems = useCallback(
    (sourceNode?: MenuItemGroup) => {
      const items = useRxValue(graph.connections(sourceNode?.id || ROOT_ID)) as MenuItem[];
      return items;
    },
    [graph],
  );

  return { useGroupItems };
};
