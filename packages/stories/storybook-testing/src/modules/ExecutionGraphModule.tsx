//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import { ExecutionGraph } from '@dxos/assistant/ExecutionGraph';
import { InvocationTraceStartEvent } from '@dxos/compute-runtime';
import { Filter, Query } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Timeline } from '@dxos/react-ui-trace';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

export const ExecutionGraphModule = () => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return <ExecutionGraphContainer space={space} />;
};

const ExecutionGraphContainer = ({ space }: { space: Space }) => {
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
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  // The message-based graph, built from the feed's objects rather than the trace.
  const { branches, commits } = useMemo(() => {
    const graph = new ExecutionGraph();
    graph.addEvents([...objects]);
    return graph.getGraph();
  }, [objects]);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Execution Graph</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <ScrollArea.Root orientation='vertical' classNames='h-full'>
          <ScrollArea.Viewport ref={setViewport}>
            <Timeline branches={branches} commits={commits} scroller={viewport} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
