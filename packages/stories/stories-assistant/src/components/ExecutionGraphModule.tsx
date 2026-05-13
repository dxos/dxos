//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Feed, Obj } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { type Queue, useQueue } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

import { type ModuleProps } from './types';

export const ExecutionGraphModule = ({ space, traceQueue }: ModuleProps & { traceQueue?: Queue }) => {
  const traceFeed = space.properties?.invocationTraceFeed?.target;
  const traceQueueDxn = traceFeed ? Feed.getQueueDxn(traceFeed) : undefined;
  const invocations = useQueue(traceQueueDxn)?.objects.filter(Obj.instanceOf(InvocationTraceStartEvent)) ?? [];
  // Use provided traceQueue, or fall back to the per-invocation trace queue from the most recent invocation.
  // Schema field is Ref(Feed.Feed) (typed), but at runtime queue-kinded DXNs resolve to a Queue instance.
  const queue = traceQueue ?? (invocations?.at(-1)?.invocationTraceQueue?.target as Queue | undefined);
  const { branches, commits } = useExecutionGraph(queue);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
