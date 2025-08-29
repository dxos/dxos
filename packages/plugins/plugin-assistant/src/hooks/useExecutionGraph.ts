//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Queue } from '@dxos/client/echo';
import { Obj, type Ref } from '@dxos/echo';
import { useQueue } from '@dxos/react-client/echo';

import { ExecutionGraph } from '../execution-graph';

export const useExecutionGraph = (traceQueueRef?: Ref.Ref<Queue>) => {
  const queue = useQueue(traceQueueRef?.dxn);
  return useMemo(() => {
    const graph = new ExecutionGraph();
    graph.addEvents(queue?.objects.filter(Obj.isObject) ?? []);
    return graph.getGraph();
  }, [queue?.objects]);
};
