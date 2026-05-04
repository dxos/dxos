//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Trace } from '@dxos/compute';
import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { FeedTraceSink, Process } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useComputeRuntimeService } from '@dxos/plugin-automation/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { composable, mx } from '@dxos/ui-theme';

import { ProcessTree, ProcessTreeProps } from '#components';

import { buildExecutionGraph } from './execution-graph';

export type TracePanelProps = AppSurface.SpaceArticleProps<Pick<ProcessTreeProps, 'onProcessTerminate'>>;

export const TracePanel = composable<HTMLDivElement, TracePanelProps>(
  ({ space, onProcessTerminate, ...props }, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const { branches, commits } = useExecutionGraph(space);
    const runtime = useComputeRuntimeService(Process.ProcessMonitorService, space.id);
    const processes = useAtomValue(runtime?.processTreeAtom ?? atomEmpty);

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

    // Select current branch.
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);
    const handleProcessSelect = useCallback(
      (process: Process.Info) => {
        const branch = branches.find((branch) => branch === process.pid.toString());
        if (branch) {
          log.info('select', { process, branch });
          setCurrentBranch(branch);
        }
      },
      [branches],
    );

    return (
      <Panel.Root {...props} ref={forwardedRef}>
        <Panel.Content className='grid grid-rows-[min-content_1fr] divide-y divide-separator'>
          <ProcessTree
            classNames={mx('max-h-[8lh] border-b border-separator')}
            processes={processes}
            onProcessSelect={handleProcessSelect}
            onProcessTerminate={onProcessTerminate}
          />
          <Timeline
            currentBranch={currentBranch}
            branches={branches}
            commits={commits}
            compact
            onCommitClick={handleCommitClick}
          />
        </Panel.Content>
      </Panel.Root>
    );
  },
);

// Stable ref.
const atomEmpty = Atom.make(() => [] as const);

type ExecutionGraph = {
  branches: string[];
  commits: Commit[];
};

type UseExecutionGraphOptions = {
  eventLimit?: number;
};

const useExecutionGraph = (space: Space, { eventLimit }: UseExecutionGraphOptions = {}): ExecutionGraph => {
  const runtime = useComputeRuntimeService(Process.ProcessMonitorService, space.id);
  const activeProcesses = useAtomValue(runtime?.processTreeAtom ?? atomEmpty);
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
