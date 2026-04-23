//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import React, { useCallback, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Trace } from '@dxos/functions';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { composable, mx } from '@dxos/ui-theme';

import { ProcessTree } from '../../components';
import { buildExecutionGraph } from './execution-graph';

export type TracePanelProps = {
  space: Space;
};

export const TracePanel = composable<HTMLDivElement, TracePanelProps>(({ space, ...props }, forwardedRef) => {
  const { invokePromise } = useOperationInvoker();
  const { branches, commits } = useExecutionGraph(space);

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
 * ProcessMonitor is contributed as a shared application-affinity capability
 * by the process-manager-capability module (see `@dxos/app-framework/plugin-runtime`).
 * It's a singleton across spaces — no per-space runtime lookup needed.
 */
const ActiveProcessList = (_props: { spaceId: Space['id'] }) => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const activeProcesses = useAtomValue(monitor?.processTreeAtom ?? atomEmpty);
  if (activeProcesses.length === 0) {
    return <div />;
  }

  return <ProcessTree classNames={mx('max-h-[8lh] px-2 border-b border-separator')} processes={activeProcesses} />;
};

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
