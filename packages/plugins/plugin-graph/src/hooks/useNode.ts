//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { type Graph, type Node } from '@dxos/app-graph';

/**
 * React hook to get a node from the graph.
 *
 * @param graph Graph to find the node in.
 * @param id Id of the node to find.
 * @param timeout Optional timeout in milliseconds to wait for the node to be found.
 * @returns Node if found, undefined otherwise.
 */
// TODO(wittjosiah): Factor out to @dxos/app-graph/react.
export const useNode = <T = any>(graph: Graph.ReadableGraph, id?: string): Node.Node<T> | undefined => {
  const atom = useMemo(() => graph.node(id ?? ''), [graph, id]);
  return Option.getOrElse(useAtomValue(atom), () => undefined);
};

export const useConnections = (
  graph: Graph.ReadableGraph,
  id: string | undefined,
  relation: Node.RelationInput,
): Node.Node[] => {
  return useAtomValue(graph.connections(id ?? '', relation));
};

export const useActions = (graph: Graph.ReadableGraph, id?: string): Node.Node[] => {
  const atom = useMemo(() => graph.actions(id ?? ''), [graph, id]);
  return useAtomValue(atom);
};

/** Subscribe to just the edge topology (inbound/outbound IDs) of a node without subscribing to node content. */
export const useEdges = (graph: Graph.ReadableGraph, id?: string): Graph.Edges => {
  const atom = useMemo(() => graph.edges(id ?? ''), [graph, id]);
  return useAtomValue(atom);
};
