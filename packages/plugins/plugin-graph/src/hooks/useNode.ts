//
// Copyright 2024 DXOS.org
//

import { useRxValue } from '@effect-rx/rx-react';
import { Option } from 'effect';

import { type ReadableGraph, type Node, type Relation } from '@dxos/app-graph';

/**
 * React hook to get a node from the graph.
 *
 * @param graph Graph to find the node in.
 * @param id Id of the node to find.
 * @param timeout Optional timeout in milliseconds to wait for the node to be found.
 * @returns Node if found, undefined otherwise.
 */
// TODO(wittjosiah): Factor out to @dxos/app-graph/react.
export const useNode = <T = any>(graph: ReadableGraph, id?: string): Node<T> | undefined => {
  return Option.getOrElse(useRxValue(graph.node(id ?? '')), () => undefined);
};

export const useConnections = (graph: ReadableGraph, id?: string, relation?: Relation): Node[] => {
  return useRxValue(graph.connections(id ?? '', relation));
};

export const useActions = (graph: ReadableGraph, id?: string): Node[] => {
  return useRxValue(graph.actions(id ?? ''));
};
