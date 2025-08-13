//
// Copyright 2025 DXOS.org
//

import { type Queue } from '@dxos/client/echo';
import { Obj, type Ref } from '@dxos/echo';
import { useQueue } from '@dxos/react-client/echo';

import { ExecutionGraph } from '../execution-graph/execution-graph';

export const useExecutionGraph = (traceQueueRef?: Ref.Ref<Queue>) => {
  const traceQueue = useQueue(traceQueueRef?.dxn);
  const graph = new ExecutionGraph();
  graph.addEvents(traceQueue?.objects.filter(Obj.isObject) ?? []);
  return graph.getGraph();
};
