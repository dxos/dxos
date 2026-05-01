//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import React, { useCallback, useEffect, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Process, Trace } from '@dxos/functions';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { composable, mx } from '@dxos/ui-theme';

import { ProcessTree } from '#components';

import { buildExecutionGraph } from './execution-graph';

// Stable ref.
const atomEmpty = Atom.make(() => [] as const);

export type TracePanelProps = AppSurface.SpaceArticleProps;

export const TracePanel = composable<HTMLDivElement, TracePanelProps>(({ space, ...props }, forwardedRef) => {
  const { invokePromise } = useOperationInvoker();
  const { branches, commits } = useExecutionGraph(space);

  useEffect(() => {
    log('trace panel render graph', { spaceId: space.id, branchCount: branches.length, commitCount: commits.length });
  }, [space.id, branches.length, commits.length]);

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

  return (
    <Panel.Root {...props} ref={forwardedRef}>
      <Panel.Content className='grid grid-rows-[min-content_1fr]'>
        <ActiveProcessList spaceId={space.id} />

        <Timeline branches={branches} commits={commits} compact onCommitClick={handleCommitClick} />
      </Panel.Content>
    </Panel.Root>
  );
});

/**
 * Renders the active process tree from the shared `ProcessMonitor` capability.
 * The monitor is a singleton across spaces so it does not need a per-space lookup.
 */
const ActiveProcessList = ({ spaceId }: { spaceId: Space['id'] }) => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const activeProcesses = useAtomValue(monitor?.processTreeAtom ?? atomEmpty);

  useEffect(() => {
    log('trace panel process tree', { spaceId, processCount: activeProcesses.length });
  }, [spaceId, activeProcesses.length]);

  if (activeProcesses.length === 0) {
    return <div />;
  }

  return <ProcessTree classNames={mx('max-h-[8lh] px-2 border-b border-separator')} processes={activeProcesses} />;
};

type ExecutionGraph = {
  branches: string[];
  commits: Commit[];
};

type UseExecutionGraphOptions = {
  eventLimit?: number;
};

const useExecutionGraph = (space: Space, { eventLimit }: UseExecutionGraphOptions = {}): ExecutionGraph => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const activeProcesses = useAtomValue(monitor?.processTreeAtom ?? atomEmpty);

  const atom = useMemo(
    () => getExecutionGraph(space, activeProcesses, { eventLimit }),
    [space, activeProcesses, eventLimit],
  );
  return useAtomValue(atom);
};

const getExecutionGraph = (
  space: Space,
  activeProcesses: readonly Process.Info[] = [],
  { eventLimit = 300 }: UseExecutionGraphOptions = {},
): Atom.Atom<ExecutionGraph> => {
  return pipe(
    AtomQuery.make(space.db, FeedTraceSink.query),
    Atom.map((feeds) => {
      log('trace panel query trace feeds', { spaceId: space.id, feedCount: feeds.length });
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
          activeProcesses,
          eventLimit,
        }),
      ),
  );
};
