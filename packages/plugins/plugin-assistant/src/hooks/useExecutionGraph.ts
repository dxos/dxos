//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Queue } from '@dxos/client/echo';
import { Obj, type Ref } from '@dxos/echo';
import { useQueue } from '@dxos/react-client/echo';

import { ExecutionGraph } from '../execution-graph';

export const useExecutionGraph = (queueRef?: Queue, lastRequest = false) => {
  const queue = useQueue(queueRef?.dxn);
  return useMemo(() => {
    const graph = new ExecutionGraph();
    graph.addEvents(queue?.objects.filter(Obj.isObject) ?? []);
    return graph.getGraph(lastRequest);
  }, [queue?.objects, lastRequest]);
};
