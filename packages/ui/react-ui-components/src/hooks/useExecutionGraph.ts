//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { ExecutionGraph } from '@dxos/assistant';
import { Filter, Obj } from '@dxos/echo';
import { type Queue, useQuery } from '@dxos/react-client/echo';

export const useExecutionGraph = (queueRef?: Queue, lastRequest = false) => {
  const objects = useQuery(queueRef, Filter.everything());
  return useMemo(() => {
    const graph = new ExecutionGraph();
    graph.addEvents(objects.filter(Obj.isObject) ?? []);
    return graph.getGraph(lastRequest);
  }, [objects, lastRequest]);
};
