//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';
import * as Duration from 'effect/Duration';
import { pipe } from 'effect/Function';
import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability, useAtomCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Process, Trace } from '@dxos/compute';
import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { EID } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { ScrollContainer } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { ProcessTree, ProcessTreeProps } from '#components';
import { buildExecutionGraph, type ExecutionGraph } from '#execution-graph';
import { AssistantCapabilities } from '#types';

export type TracePanelProps = AppSurface.SpaceArticleProps<Pick<ProcessTreeProps, 'onProcessTerminate'>>;

export const TracePanel = composable<HTMLDivElement, TracePanelProps>(
  ({ space, attendableId, onProcessTerminate, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes(attendableId);
    const { invokePromise } = useOperationInvoker();
    const settings = useAtomCapability(AssistantCapabilities.Settings);
    const tracePanelDebug = settings.tracePanelDebug ?? false;

    // `useDeferredValue` batches update bursts, works together with `React.memo`.
    // See the comment in `ProcessTreeContainer` for more details.
    const { branches, commits, spanTree, details } = useDeferredValue(useExecutionGraph(space));

    const [selectedCommit, setSelectedCommit] = useState<Commit | undefined>();
    const handleCommitSelect = useCallback(
      (commit: Commit | undefined) => {
        setSelectedCommit(commit);
        if (commit?.link) {
          const echoUri = EID.tryParse(commit.link);
          const spaceId = echoUri ? EID.getSpaceId(echoUri) : undefined;
          const objectId = echoUri ? EID.getEntityId(echoUri) : undefined;
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
            !tracePanelDebug && selectedCommit
              ? 'grid-rows-[minmax(0,8lh)_1fr_minmax(0,206px)]'
              : 'grid-rows-[minmax(0,8lh)_1fr]',
          ),
        })}
        ref={forwardedRef}
      >
        <ProcessTreeContainer onProcessSelect={handleProcessSelect} onProcessTerminate={onProcessTerminate} />

        <ScrollContainer.Root pin>
          <ScrollContainer.Content thin>
            <ScrollContainer.Fade />
            <ScrollContainer.Viewport>
              {tracePanelDebug ? (
                <Syntax.Root data={spanTree}>
                  <Syntax.Content>
                    <Syntax.Viewport>
                      <Syntax.Code className='text-xs' />
                    </Syntax.Viewport>
                  </Syntax.Content>
                </Syntax.Root>
              ) : (
                <Timeline
                  compact
                  commits={commits}
                  branches={branches}
                  currentBranch={currentBranch}
                  onSelect={handleCommitSelect}
                />
              )}
            </ScrollContainer.Viewport>
            <ScrollContainer.ScrollDownButton />
          </ScrollContainer.Content>
        </ScrollContainer.Root>

        {!tracePanelDebug && selectedCommit && (
          <Syntax.Root data={details[selectedCommit.id] ?? selectedCommit}>
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

type UseExecutionGraphOptions = {
  eventLimit?: number;
};

const useExecutionGraph = (space: Space, { eventLimit }: UseExecutionGraphOptions = {}): ExecutionGraph => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const processesAtom = monitor?.processTreeAtom ?? atomEmpty;

  const atom = useMemo(
    () => getExecutionGraph(space, processesAtom, { eventLimit }),
    [space, processesAtom, eventLimit],
  );

  return useAtomValue(atom);
};

const getExecutionGraph = (
  space: Space,
  processesAtom: Atom.Atom<readonly Process.Info[]>,
  { eventLimit = 100 }: UseExecutionGraphOptions = {},
): Atom.Atom<ExecutionGraph> => {
  const traceMessages = pipe(
    AtomQuery.make(space.db, FeedTraceSink.query),
    Atom.map((feeds) =>
      // TODO(dmaretskyi): This should be possible in a single query with properly working limit(1) and feed > feed contents traversal.
      AtomQuery.make(
        space.db,
        feeds.length > 0
          ? Query.type(Trace.Message).from(feeds[0])
          : (Query.select(Filter.nothing()) as Query.Query<never>),
      ),
    ),
    (atom) => Atom.make((get) => get(get(atom))),
  );

  const activeProcesses = pipe(
    processesAtom,
    Atom.debounce(Duration.millis(100)),
    Atom.map((processes) =>
      // `Data.array` does structural comparison on the array elements.
      Data.array(
        processes
          .filter((process) => process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING)
          .map(Data.struct),
      ),
    ),
  );

  return Atom.make((get) =>
    buildExecutionGraph({
      traceMessages: get(traceMessages),
      activeProcesses: get(activeProcesses),
      eventLimit,
    }),
  );
};
TracePanel.displayName = 'TracePanel';

// Isolate `ProcessTree` updates from the rest of the panel.
// TODO(dmaretskyi): Currently not useful since `useExecutionGraph` also pulls in the updates.
const ProcessTreeContainer = ({
  onProcessSelect,
  onProcessTerminate,
}: Pick<ProcessTreeProps, 'onProcessSelect' | 'onProcessTerminate'>) => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const processes = useAtomValue(monitor?.processTreeAtom ?? atomEmpty);

  // `processes` updates in bursts (about 14 updates per navigation).
  // `useDeferredValue` will debounce update propagation, returning stale value for short periods.
  // NOTE: `ProcessTree` MUST use `React.memo`, otherwise this will not work.
  const processesDeferred = useDeferredValue(processes);
  return (
    <ProcessTree
      processes={processesDeferred}
      onProcessSelect={onProcessSelect}
      onProcessTerminate={onProcessTerminate}
    />
  );
};
