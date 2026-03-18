//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { type Database, Filter, Query } from '@dxos/echo';
import { InvocationOutcome, InvocationTraceEndEvent, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation';
import { useActiveSpace } from '@dxos/plugin-space';
import { useQuery, type Space } from '@dxos/react-client/echo';
import { Input, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Commit, Timeline } from '@dxos/react-ui-components';

import { meta } from '../../meta';
import { dbg } from '@dxos/log';

export const TracePanel = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <TracePanelMain space={space} />;
};

const TracePanelMain = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const { state, start, stop } = useTriggerRuntimeControls(space.db);
  const isRunning = state?.enabled ?? false;

  // TODO(dmaretskyi): Make a feed.
  const traceQueueDxn = dbg(space.properties.invocationTraceQueue?.dxn);
  const events = useQuery(
    space.db,
    traceQueueDxn
      ? Query.select(Filter.everything()).from({ queues: [traceQueueDxn.toString()] })
      : Query.select(Filter.nothing()),
  );

  const { branches, commits } = useMemo(() => {
    const branches: string[] = ['invocations'];
    const commits: Commit[] = [];

    dbg(events);
    const sorted = [...events].sort((a: any, b: any) => a.timestamp - b.timestamp);
    for (const event of sorted) {
      if (Schema.is(InvocationTraceStartEvent)(event)) {
        commits.push({
          id: event.id,
          branch: 'invocations',
          parents: commits.length > 0 ? [commits[commits.length - 1].id] : [],
          icon: 'ph--play--regular',
          message: `Start ${event.invocationId.slice(0, 8)}`,
          timestamp: new Date(event.timestamp),
        });
      } else if (Schema.is(InvocationTraceEndEvent)(event)) {
        const icon =
          event.outcome === InvocationOutcome.SUCCESS
            ? 'ph--check-circle--regular'
            : event.outcome === InvocationOutcome.FAILURE
              ? 'ph--x-circle--regular'
              : 'ph--circle--regular';
        commits.push({
          id: event.id,
          branch: 'invocations',
          parents: commits.length > 0 ? [commits[commits.length - 1].id] : [],
          icon,
          message: `End ${event.invocationId.slice(0, 8)} — ${event.outcome}`,
          timestamp: new Date(event.timestamp),
        });
      }
    }

    return { branches, commits };
  }, [events]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.Switch checked={isRunning} onCheckedChange={isRunning ? stop : start} />
            <span className='text-sm'>{t('trigger runtime label')}</span>
          </Input.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Timeline branches={branches} commits={commits} compact />
      </Panel.Content>
    </Panel.Root>
  );
};
