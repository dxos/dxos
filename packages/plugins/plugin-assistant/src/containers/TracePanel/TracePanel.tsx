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
import { EchoURI } from '@dxos/keys';
import { log } from '@dxos/log';
import { useComputeRuntimeService } from '@dxos/plugin-automation/hooks';
import { type Space } from '@dxos/react-client/echo';
import { ScrollContainer } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { composable, composableProps, mx } from '@dxos/ui-theme';

import { ProcessTree, ProcessTreeProps } from '#components';

import { buildExecutionGraph } from './execution-graph';

export type TracePanelProps = AppSurface.SpaceArticleProps<Pick<ProcessTreeProps, 'onProcessTerminate'>>;

export const TracePanel = composable<HTMLDivElement, TracePanelProps>(
  ({ space, attendableId, onProcessTerminate, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes(attendableId);
    const { invokePromise } = useOperationInvoker();
    const { branches, commits } = useExecutionGraph(space);
    const runtime = useComputeRuntimeService(Process.ProcessMonitorService, space.id);
    const processes = useAtomValue(runtime?.processTreeAtom ?? atomEmpty);

    const [selectedCommit, setSelectedCommit] = useState<Commit | undefined>();
    const handleCommitSelect = useCallback(
      (commit: Commit | undefined) => {
        setSelectedCommit(commit);
        if (commit?.link) {
          const echoId = EchoURI.tryParse(commit.link);
          const spaceId = echoId ? EchoURI.getSpaceId(echoId) : undefined;
          const objectId = echoId ? EchoURI.getObjectId(echoId) : undefined;
          if (spaceId && objectId) {
            // TODO(dmaretskyi): Navigates, but fails to open.
            void invokePromise(LayoutOperation.Open, {
              subject: [`${spaceId}:${objectId}`],
            });
          }
        }
      },
      [invokePromise, setSelectedCommit],
    );

    // Select current branch.
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);
    const handleProcessSelect = useCallback(
      (process: Process.Info) => {
        const branch = branches.find((branch) => branch === process.pid.toString());
        if (branch) {
          setCurrentBranch(branch);
        }
      },
      [branches],
    );

    return (
      <div
        {...composableProps(props, {
          ...attentionAttrs,
          classNames: mx(
            'h-full grid divide-y divide-separator',
            selectedCommit ? 'grid-rows-[minmax(0,4lh)_1fr_minmax(0,206px)]' : 'grid-rows-[minmax(0,4lh)_1fr]',
          ),
        })}
        ref={forwardedRef}
      >
        <ProcessTree
          processes={processes}
          onProcessSelect={handleProcessSelect}
          onProcessTerminate={onProcessTerminate}
        />

        <ScrollContainer.Root pin>
          <ScrollContainer.Content thin>
            <ScrollContainer.Fade />
            <ScrollContainer.Viewport>
              <Timeline
                compact
                commits={commits}
                branches={branches}
                currentBranch={currentBranch}
                onSelect={handleCommitSelect}
              />
            </ScrollContainer.Viewport>
            <ScrollContainer.ScrollDownButton />
          </ScrollContainer.Content>
        </ScrollContainer.Root>

        {selectedCommit && (
          <Syntax.Root data={selectedCommit}>
            <Syntax.Content>
              <Syntax.Viewport>
                <Syntax.Code className='text-xs' />
              </Syntax.Viewport>
            </Syntax.Content>
          </Syntax.Root>
        )}
      </div>
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
