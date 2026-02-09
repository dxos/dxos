//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';

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
  return Option.getOrElse(useAtomValue(graph.node(id ?? '')), () => undefined);
};

export const useConnections = (graph: Graph.ReadableGraph, id?: string, relation?: Node.Relation): Node.Node[] => {
  return useAtomValue(graph.connections(id ?? '', relation));
};

export const useActions = (graph: Graph.ReadableGraph, id?: string): Node.Node[] => {
  return useAtomValue(graph.actions(id ?? ''));
};
