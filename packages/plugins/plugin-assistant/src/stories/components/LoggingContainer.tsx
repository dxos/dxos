//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { Obj } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions';
import { type Queue, useQuery, useQueue } from '@dxos/react-client/echo';
import { Timeline } from '@dxos/react-ui-components';

import { useExecutionGraph } from '../../hooks';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';

export const LoggingContainer = ({ space, traceQueue }: ComponentProps & { traceQueue?: Queue }) => {
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));
  const invocations =
    useQueue(space.properties?.invocationTraceQueue?.dxn)?.objects.filter(Obj.instanceOf(InvocationTraceStartEvent)) ??
    [];
  const { branches, commits } = useExecutionGraph(
    traceQueue ?? invocations?.at(-1)?.invocationTraceQueue?.target ?? chat?.traceQueue?.target,
    true,
  );

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
