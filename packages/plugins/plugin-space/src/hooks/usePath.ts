//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Graph } from '@dxos/plugin-graph';

/**
 * React hook to get a path from the graph.
 *
 * @param graph Graph to find the node in.
 * @param id Id of the node to find a path to.
 * @param timeout Optional timeout in milliseconds to wait for the node to be found.
 * @returns Path if found, undefined otherwise.
 */
// TODO(wittjosiah): Factor out.
export const usePath = (graph: Graph, id?: string, timeout?: number): string[] | undefined => {
  const [pathState, setPathState] = useState<string[] | undefined>(id ? graph.getPath({ target: id }) : undefined);

  useEffect(() => {
    if (!id && pathState) {
      setPathState(undefined);
    }

    if (pathState?.at(-1) === id || !id) {
      return;
    }

    // Set timeout did not seem to effectively not block the UI thread.
    const frame = requestAnimationFrame(async () => {
      try {
        const path = await graph.waitForPath({ target: id }, { timeout });
        if (path) {
          setPathState(path);
        }
      } catch {}
    });

    return () => cancelAnimationFrame(frame);
  }, [graph, id, timeout, pathState]);

  return pathState;
};
