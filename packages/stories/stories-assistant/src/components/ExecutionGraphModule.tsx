//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { type Queue, useQueue } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

import { type ComponentProps } from './types';

export const ExecutionGraphModule = ({ space, traceQueue }: ComponentProps & { traceQueue?: Queue }) => {
  const invocations =
    useQueue(space.properties?.invocationTraceQueue?.dxn)?.objects.filter(Obj.instanceOf(InvocationTraceStartEvent)) ??
    [];
  // Use provided traceQueue, or fall back to the per-invocation trace queue from the most recent invocation.
  const queue = traceQueue ?? invocations?.at(-1)?.invocationTraceQueue?.target;
  const { branches, commits } = useExecutionGraph(queue);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
