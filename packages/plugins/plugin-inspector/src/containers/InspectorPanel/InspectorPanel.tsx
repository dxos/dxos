//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import React, { useCallback, useMemo } from 'react';

import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Trace } from '@dxos/functions';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { type Space } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { ExecutionTimeline, InspectorToolbar } from '#components';
import { useActiveAgentProcesses, useEphemeralSteps } from '#hooks';

export type InspectorPanelProps = {
  space: Space;
};

/**
 * Main Inspector container. Subscribes to trace events and renders execution timeline.
 */
export const InspectorPanel = ({ space }: InspectorPanelProps) => {
  const processes = useActiveAgentProcesses(space.id);
  const traceMessages = useTraceMessages(space);
  const steps = useEphemeralSteps(traceMessages);

  const handleStop = useCallback(() => {
    // TODO(inspector): Implement stop via ProcessManager.attach().terminate().
  }, []);

  const handleClear = useCallback(() => {
    // TODO(inspector): Implement clear steps.
  }, []);

  return (
    <Panel.Root>
      <Panel.Content className='grid grid-rows-[min-content_1fr] overflow-hidden'>
        <InspectorToolbar
          processes={processes}
          steps={steps}
          onStop={processes.length > 0 ? handleStop : undefined}
          onClear={handleClear}
        />
        <ExecutionTimeline steps={steps} />
      </Panel.Content>
    </Panel.Root>
  );
};

/**
 * Reads trace messages from the space's feed, using the same pattern as TracePanel.
 */
const useTraceMessages = (space: Space): readonly Trace.Message[] => {
  const atom = useMemo(
    () =>
      pipe(
        AtomQuery.make(space.db, FeedTraceSink.query),
        Atom.map((feeds) =>
          AtomQuery.make(
            space.db,
            feeds.length > 0 ? Query.type(Trace.Message).from(feeds[0]) : Query.select(Filter.nothing()),
          ),
        ),
        (intermediate) => Atom.make((get) => get(get(intermediate)) as readonly Trace.Message[]),
      ),
    [space],
  );
  return useAtomValue(atom);
};
