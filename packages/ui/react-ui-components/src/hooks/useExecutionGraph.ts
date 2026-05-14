//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { ExecutionGraph } from '@dxos/assistant';
import { type Obj } from '@dxos/echo';

/**
 * Build an execution graph (branches + commits) from a snapshot of events.
 *
 * Callers are responsible for querying the events (e.g. via `useQuery(db, Query.select(...).from(feed))`
 * or `useQuery`) and passing the result here.
 */
export const useExecutionGraph = (objects: readonly Obj.Unknown[], lastRequest = false) => {
  return useMemo(() => {
    const graph = new ExecutionGraph();
    graph.addEvents([...objects]);
    return graph.getGraph(lastRequest);
  }, [objects, lastRequest]);
};
