//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

// Subpath, not the barrel: the assistant barrel drags @effect/ai (fast-check/zod/ajv) into
// every static consumer — this hook rides the boot path via the react-ui-form closure.
import { ExecutionGraph } from '@dxos/assistant/ExecutionGraph';
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
