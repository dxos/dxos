//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Graph, type Node } from '@dxos/plugin-graph';

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
