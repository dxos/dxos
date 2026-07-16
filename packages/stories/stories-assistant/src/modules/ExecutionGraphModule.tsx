//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter, Query } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/compute-runtime';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';
import { type ModuleProps } from '@dxos/story-modules';

export const ExecutionGraphModule = ({ space }: ModuleProps) => {
  const invocationsFeed = space.properties?.invocationTraceFeed?.target;
  const invocations = useQuery(
    space.db,
    invocationsFeed
      ? Query.select(Filter.type(InvocationTraceStartEvent)).from(invocationsFeed)
      : Query.select(Filter.nothing()),
  );

  // Derive the trace feed from the most recent invocation's `invocationTraceFeed`.
  const feed = invocations?.at(-1)?.invocationTraceFeed?.target;
  const objects = useQuery(
    space.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );
  const { branches, commits } = useExecutionGraph(objects);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Execution Graph</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Timeline branches={branches} commits={commits} />
      </Panel.Content>
    </Panel.Root>
  );
};
