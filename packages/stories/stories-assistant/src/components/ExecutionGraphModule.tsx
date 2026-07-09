//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter, Query } from '@dxos/echo';
import { InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

export const ExecutionGraphModule = ({ space }: { space: Space }) => {
  const invocationsFeed = space.properties?.invocationTraceFeed?.target;
  const invocations = useQuery(
    space.db,
    invocationsFeed
      ? Query.select(Filter.type(InvocationTraceStartEvent)).from(invocationsFeed)
      : Query.select(Filter.nothing()),
  );

  // Use provided trace feed, or fall back to the per-invocation trace feed from the most recent invocation.
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
