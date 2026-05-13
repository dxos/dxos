//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Feed, Filter } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { useFeedQuery } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

import { type ModuleProps } from './types';

export const ExecutionGraphModule = ({ space, traceFeed }: ModuleProps & { traceFeed?: Feed.Feed }) => {
  const invocationsFeed = space.properties?.invocationTraceFeed?.target;
  const invocations = useFeedQuery(invocationsFeed, Filter.type(InvocationTraceStartEvent));
  // Use provided trace feed, or fall back to the per-invocation trace feed from the most recent invocation.
  const feed = traceFeed ?? invocations?.at(-1)?.invocationTraceQueue?.target;
  const objects = useFeedQuery(feed, Filter.everything());
  const { branches, commits } = useExecutionGraph(objects);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
