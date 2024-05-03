//
// Copyright 2024 DXOS.org
//

import { type Graph } from './graph';
import { type Node, type NodeArg } from './node';

/**
 * If the condition is true, adds the nodes to the graph, otherwise removes the nodes from the graph.
 */
export const manageNodes = <TData = null, TProperties extends Record<string, any> = Record<string, any>>({
  graph,
  condition,
  nodes,
  removeEdges,
}: {
  graph: Graph;
  condition: boolean;
  nodes: NodeArg<TData, TProperties>[];
  removeEdges?: boolean;
}): Node<TData, TProperties>[] | void => {
  if (condition) {
    return graph.addNodes(...nodes);
  } else {
    nodes.forEach(({ id }) => graph.removeNode(id, removeEdges));
  }
};
