//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Trace } from '@dxos/functions';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { Process } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { useComputeRuntimeService } from '@dxos/plugin-automation/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { composable } from '@dxos/ui-theme';
import { mx } from '@dxos/ui-theme';

import { ProcessTree } from '#components';

import { buildExecutionGraph } from './execution-graph';

// Stable ref.
const atomEmpty = Atom.make(() => [] as const);

export type TracePanelProps = AppSurface.SpaceArticleProps;

export const TracePanel = composable<HTMLDivElement, TracePanelProps>(({ space, ...props }, forwardedRef) => {
  const { invokePromise } = useOperationInvoker();
  const { branches, commits } = useExecutionGraph(space);

  const runtime = useComputeRuntimeService(Process.ProcessMonitorService, space.id);
  const activeProcesses = useAtomValue(runtime?.processTreeAtom ?? atomEmpty);

  const handleCommitClick = useCallback(
    (commit: Commit) => {
      if (commit.link) {
        const dxn = DXN.tryParse(commit.link)?.asEchoDXN();
        if (dxn?.spaceId && dxn.echoId) {
          // TODO(dmaretskyi): Navigates, but fails to open.
          void invokePromise(LayoutOperation.Open, {
            subject: [`${dxn.spaceId}:${dxn.echoId}`],
          });
        }
      }
    },
    [invokePromise],
  );

  if (activeProcesses.length === 0 && commits.length === 0) {
    return <div />;
  }

  return (
    <Panel.Root {...props} ref={forwardedRef}>
      <Panel.Content className='grid grid-rows-[min-content_1fr]'>
        {activeProcesses.length > 0 && (
          <ProcessTree classNames={mx('max-h-[8lh] px-2 border-b border-separator')} processes={activeProcesses} />
        )}
        <Timeline branches={branches} commits={commits} compact onCommitClick={handleCommitClick} />
      </Panel.Content>
    </Panel.Root>
  );
});

type ExecutionGraph = {
  branches: string[];
  commits: Commit[];
};

type UseExecutionGraphOptions = {
  eventLimit?: number;
};

const useExecutionGraph = (space: Space, { eventLimit }: UseExecutionGraphOptions = {}): ExecutionGraph => {
  const atom = useMemo(() => getExecutionGraph(space, { eventLimit }), [space, eventLimit]);
  return useAtomValue(atom);
};

const getExecutionGraph = (
  space: Space,
  { eventLimit = 100 }: UseExecutionGraphOptions = {},
): Atom.Atom<ExecutionGraph> => {
  return pipe(
    AtomQuery.make(space.db, FeedTraceSink.query),
    Atom.map((feeds) => {
      // TODO(dmaretskyi): This should be possible in a single query with properly working limit(1) and feed > feed contents traversal.
      return AtomQuery.make(
        space.db,
        feeds.length > 0
          ? Query.type(Trace.Message).from(feeds[0])
          : (Query.select(Filter.nothing()) as Query.Query<never>),
      );
    }),
    (_) => Atom.make((get) => get(get(_))),
    (_) =>
      Atom.make((get) =>
        buildExecutionGraph({
          traceMessages: [...get(_)],
          activeProcesses: [],
          eventLimit,
        }),
      ),
  );
};
