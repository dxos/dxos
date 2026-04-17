//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Trace } from '@dxos/functions';
import { FeedTraceSink, Process } from '@dxos/functions-runtime';
import { DXN, SpaceId } from '@dxos/keys';
import { useComputeRuntimeService } from '@dxos/plugin-automation/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { mx } from '@dxos/ui-theme';

import { ProcessTree } from '../../components';
import { buildExecutionGraph } from './execution-graph';

export const TracePanel = ({ space }: { space: Space }) => {
  const { invokePromise } = useOperationInvoker();
  const activeProcesses = useActiveProcesses(space.id);
  const runtime = useComputeRuntimeService(Process.ProcessMonitorService, space.id);

  const { branches, commits } = useAtomValue(
    useMemo(
      () => getExecutionGraph(space, runtime?.processTreeAtom ?? Atom.make(() => [])),
      [space, runtime?.processTreeAtom],
    ),
  );

  const handleCommitClick = useCallback(
    (commit: Commit) => {
      if (commit.link) {
        const dxn = DXN.tryParse(commit.link)?.asEchoDXN();
        if (dxn?.spaceId && dxn.echoId) {
          // TODO(dmaretskyi): Navigates, but fails to open.
          void invokePromise(LayoutOperation.Open, { subject: [`${dxn.spaceId}:${dxn.echoId}`] });
        }
      }
    },
    [invokePromise],
  );

  return (
    <Panel.Root>
      <Panel.Content className='grid grid-rows-[min-content_1fr]'>
        <ProcessTree
          classNames={mx('max-h-[8lh] px-2', activeProcesses.length > 0 && 'border-b border-separator')}
          processes={activeProcesses}
        />
        <Timeline classNames='py-1' branches={branches} commits={commits} compact onCommitClick={handleCommitClick} />
      </Panel.Content>
    </Panel.Root>
  );
};

const getExecutionGraph = (
  space: Space,
  processTreeAtom: Atom.Atom<readonly Process.Info[]>,
  { eventLimit = 100 }: { eventLimit?: number } = {},
): Atom.Atom<{
  branches: string[];
  commits: Commit[];
}> => {
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
          activeProcesses: get(processTreeAtom),
          eventLimit,
        }),
      ),
  );
};

// Stable ref.
const atomEmpty = Atom.make(() => [] as const);

const useActiveProcesses = (id?: SpaceId) => {
  const runtime = useComputeRuntimeService(Process.ProcessMonitorService, id);
  return useAtomValue(runtime?.processTreeAtom ?? atomEmpty);
};
