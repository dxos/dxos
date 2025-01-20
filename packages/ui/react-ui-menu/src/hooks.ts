//
// Copyright 2025 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';
import { useCallback, useState } from 'react';

import { Graph, type NodeArg, type Node } from '@dxos/app-graph';

import { type MenuItem, type MenuItemGroup } from './defs';

type Edge = { source: string; target: string };

const edgesArrayToRecord = (edges: { source: string; target: string }[]): Record<string, string[]> => {
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
    ).map(([id, { outbound }]): [string, string[]] => [id, outbound]),
  );
};

export const useMenuActions = (actionCreator: () => { nodes: NodeArg<any>[]; edges: Edge[] }) => {
  const initialMenuGraphProps = actionCreator();

  const [graph] = useState(
    new Graph({ nodes: initialMenuGraphProps.nodes as Node[], edges: edgesArrayToRecord(initialMenuGraphProps.edges) }),
  );

  useSignalEffect(() => {
    const menuGraphProps = actionCreator();
    // @ts-ignore
    graph._addNodes(menuGraphProps.nodes);
    // @ts-ignore
    graph._addEdges(menuGraphProps.edges);
  });

  const resolveGroupItems = useCallback(
    (sourceNode: MenuItemGroup = graph.root as MenuItemGroup) => {
      if (graph) {
        return (graph.nodes(sourceNode, { filter: (n): n is any => true }) || null) as MenuItem[] | null;
      } else {
        return null;
      }
    },
    [graph],
  );

  return { resolveGroupItems };
};
