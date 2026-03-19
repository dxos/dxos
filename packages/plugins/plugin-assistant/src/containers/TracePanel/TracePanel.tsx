//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Obj, type Database } from '@dxos/echo';
import {
  InvocationOutcome,
  InvocationTraceEndEvent,
  InvocationTraceStartEvent,
  type InvocationTraceEvent,
} from '@dxos/functions-runtime';
import { type DXN } from '@dxos/keys';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation';
import { useActiveSpace } from '@dxos/plugin-space';
import { useQueue } from '@dxos/react-client/echo';
import { Input, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Commit, Timeline } from '@dxos/react-ui-components';

import { meta } from '../../meta';

export const TracePanel = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <TracePanelMain db={space.db} queueDxn={space.properties.invocationTraceQueue?.dxn} />;
};

const TracePanelMain = ({ db, queueDxn }: { db: Database.Database; queueDxn?: DXN }) => {
  const { t } = useTranslation(meta.id);
  const { state, start, stop } = useTriggerRuntimeControls(db);
  const isRunning = state?.enabled ?? false;

  const queue = useQueue<InvocationTraceEvent>(queueDxn, { pollInterval: 1_000 });

  const { branches, commits } = useMemo(() => {
    const events = queue?.objects ?? [];
    const branches: string[] = ['invocations'];
    const commits: Commit[] = [];

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp).slice(-80);
    for (const event of sorted) {
      if (Schema.is(InvocationTraceStartEvent)(event)) {
        const fn = event.trigger?.target?.function?.target;
        const label = fn ? Obj.getLabel(fn) : event.invocationId.slice(0, 8);
        commits.push({
          id: event.id,
          branch: 'invocations',
          parents: commits.length > 0 ? [commits[commits.length - 1].id] : [],
          icon: 'ph--play--regular',
          message: `Start ${label}`,
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
  }, [queue?.objects]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <div className='flex items-center gap-2'>
              <Input.Switch checked={isRunning} onCheckedChange={isRunning ? stop : start} />
              <Input.Label>{t('trigger runtime label')}</Input.Label>
            </div>
          </Input.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Timeline branches={branches} commits={commits} compact />
      </Panel.Content>
    </Panel.Root>
  );
};
