//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { Obj } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions';
import { type Queue, useQuery, useQueue } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

import { Assistant } from '../../types';

import { type ComponentProps } from './types';

export const ExecutionGraphContainer = ({ space, traceQueue }: ComponentProps & { traceQueue?: Queue }) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const invocations =
    useQueue(space.properties?.invocationTraceQueue?.dxn)?.objects.filter(Obj.instanceOf(InvocationTraceStartEvent)) ??
    [];
  const queue = traceQueue ?? invocations?.at(-1)?.invocationTraceQueue?.target ?? chats.at(-1)?.traceQueue?.target;
  const { branches, commits } = useExecutionGraph(queue);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
