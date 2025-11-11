//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { Obj } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { Assistant } from '@dxos/plugin-assistant';
import { type Queue, useQuery, useQueue } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

import { type ComponentProps } from './types';

export const ExecutionGraphModule = ({ space, traceQueue }: ComponentProps & { traceQueue?: Queue }) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const invocations =
    useQueue(space.properties?.invocationTraceQueue?.dxn)?.objects.filter(Obj.instanceOf(InvocationTraceStartEvent)) ??
    [];
  const queue = traceQueue ?? invocations?.at(-1)?.invocationTraceQueue?.target ?? chats.at(-1)?.traceQueue?.target;
  const { branches, commits } = useExecutionGraph(queue);

  return (
    <div className='flex flex-col bs-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
