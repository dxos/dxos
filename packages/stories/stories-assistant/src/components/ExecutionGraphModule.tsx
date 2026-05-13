//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { type Queue, useFeedQuery } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

import { type ModuleProps } from './types';

export const ExecutionGraphModule = ({ space, traceQueue }: ModuleProps & { traceQueue?: Queue }) => {
  const traceFeed = space.properties?.invocationTraceFeed?.target;
  const invocations = useFeedQuery(traceFeed, Filter.type(InvocationTraceStartEvent));
  // Use provided traceQueue, or fall back to the per-invocation trace queue from the most recent invocation.
  // useExecutionGraph still consumes Queue<Unknown>; runtime resolution returns a Queue instance.
  // TODO(burdon): Migrate useExecutionGraph to take a Feed.
  const queue = traceQueue ?? (invocations?.at(-1)?.invocationTraceQueue?.target as Queue | undefined);
  const { branches, commits } = useExecutionGraph(queue);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
