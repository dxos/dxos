//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Graph, type Node } from '@braneframe/plugin-graph';
import { nonNullable } from '@dxos/util';

/**
 * React hook to get nodes from the graph.
 *
 * @param graph Graph to find the nodes in.
 * @param ids Ids of the nodes to find.
 * @param timeout Optional timeout in milliseconds to wait for each node to be found.
 * @returns Node if found, undefined otherwise.
 */
// TODO(wittjosiah): Factor out.
export const useNodes = (graph: Graph, ids: string[], timeout?: number): Node[] => {
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    // Set timeout did not seem to effectively not block the UI thread.
    const frame = requestAnimationFrame(async () => {
      const maybeNodes = await Promise.all(
        ids.map(async (id) => {
          try {
            return await graph.waitForNode(id, timeout);
          } catch {
            return undefined;
          }
        }),
      );
      setNodes(maybeNodes.filter(nonNullable));
    });

    return () => cancelAnimationFrame(frame);
  }, [graph, JSON.stringify(ids)]);

  return nodes;
};

/**
 * React hook to get a node from the graph.
 *
 * @param graph Graph to find the node in.
 * @param id Id of the node to find.
 * @param timeout Optional timeout in milliseconds to wait for the node to be found.
 * @returns Node if found, undefined otherwise.
 */
// TODO(wittjosiah): Factor out.
export const useNode = <T = any>(graph: Graph, id?: string, timeout?: number): Node<T> | undefined => {
  const [nodeState, setNodeState] = useState<Node<T> | undefined>(id ? graph.findNode(id) : undefined);

  useEffect(() => {
    if (nodeState?.id === id || !id) {
      return;
    }

    // Set timeout did not seem to effectively not block the UI thread.
    const frame = requestAnimationFrame(async () => {
      try {
        const node = await graph.waitForNode(id, timeout);
        if (node) {
          setNodeState(node);
        }
      } catch {}
    });

    return () => cancelAnimationFrame(frame);
  }, [graph, id, timeout, nodeState?.id]);

  return nodeState;
};
