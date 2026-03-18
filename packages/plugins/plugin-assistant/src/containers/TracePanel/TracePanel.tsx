//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Filter, Obj, Query, type Database } from '@dxos/echo';
import {
  InvocationOutcome,
  InvocationTraceEndEvent,
  InvocationTraceStartEvent,
  type InvocationTraceEvent,
} from '@dxos/functions-runtime';
import { type DXN } from '@dxos/keys';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation';
import { useActiveSpace } from '@dxos/plugin-space';
import { useQuery, useQueue, type Space } from '@dxos/react-client/echo';
import { Input, messageIcons, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Commit, Timeline } from '@dxos/react-ui-components';
import { Message } from '@dxos/types';

import { meta } from '../../meta';
import * as Predicate from 'effect/Predicate';
import { dbg } from '@dxos/log';
import { Atom } from '@effect-atom/atom';
import { AtomObj, AtomQuery, AtomRef } from '@dxos/echo-atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { contains } from 'effect/Array';

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

  const { branches, commits } = useAtomValue(useMemo(() => getExecutionGraph(space), [space]));

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.Switch checked={isRunning} onCheckedChange={isRunning ? stop : start} />
          </Input.Root>
          <span className='text-sm'>{t('trigger runtime label')}</span>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Timeline branches={branches} commits={commits} compact />
      </Panel.Content>
    </Panel.Root>
  );
};

const getExecutionGraph = (
  space: Space,
): Atom.Atom<{
  branches: string[];
  commits: Commit[];
}> => {
  return AtomObj.make(space.properties).pipe(
    (properties) =>
      Atom.make((get) => {
        const queueDxn = get(properties).invocationTraceQueue?.dxn;
        dbg(queueDxn);
        return AtomQuery.make(
          space.db,
          !queueDxn
            ? (Query.select(Filter.nothing()) as Query.Query<never>) // TODO(dmaretskyi): Broken echo types here.
            : Query.select(
                Filter.or(Filter.type(InvocationTraceStartEvent), Filter.type(InvocationTraceEndEvent)),
              ).from({
                queues: [queueDxn.toString()],
              }),
        );
      }),
    (_) => Atom.make((get) => get(get(_))),
    (_) =>
      Atom.make((get) => {
        const events = get(_);
        dbg(events);
        const branches: string[] = ['invocations', 'subevents'];
        const commits: Commit[] = [];

        /** invocationId -> last commit id; so that lines close */
        const lastCommitForIvocation: Record<string, string> = {};

        const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp).slice(-80);
        for (const event of sorted) {
          if (Schema.is(InvocationTraceStartEvent)(event)) {
            const trigger = event.trigger && AtomRef.make(event.trigger).pipe(get);
            const fn =
              (event.invocationTarget && AtomRef.make(event.invocationTarget).pipe(get)) ??
              (trigger?.function && AtomRef.make(trigger.function).pipe(get));

            const functionName = fn ? Obj.getLabel(fn) : undefined;
            const triggerName = trigger?.spec?.kind ?? 'trigger';

            commits.push({
              id: event.id,
              branch: 'invocations',
              parents: commits.length > 0 ? [commits[commits.length - 1].id] : [],
              icon: 'ph--play--regular',
              message: functionName ? `${functionName} on ${triggerName}` : triggerName,
              timestamp: new Date(event.timestamp),
            });
            lastCommitForIvocation[event.invocationId] = event.id;

            const subqueue = event.invocationTraceQueue?.dxn;
            if (subqueue) {
              const subevents = get(
                AtomQuery.make(space.db, Query.select(Filter.everything()).from({ queues: [subqueue.toString()] })),
              );
              dbg(subevents);
              const branchName = `invocation-${event.invocationId.slice(0, 8)}`;
              for (const subevent of subevents) {
                if (Obj.instanceOf(Message.Message, subevent)) {
                  for (const block of subevent.blocks) {
                    switch (block._tag) {
                      case 'text':
                        commits.push({
                          id: subevent.id,
                          branch: branchName,
                          parents: [event.id],
                          icon: 'ph--robot--regular',
                          message: block.text.slice(0, 50),
                          timestamp: new Date(subevent.created),
                        });
                        if (!branches.includes(branchName)) {
                          branches.push(branchName);
                        }
                        lastCommitForIvocation[event.invocationId] = subevent.id;
                        break;
                      case 'toolCall':
                        commits.push({
                          id: subevent.id,
                          branch: branchName,
                          parents: [event.id],
                          icon: 'ph--wrench--regular',
                          message: block.name,
                          timestamp: new Date(subevent.created),
                        });
                        if (!branches.includes(branchName)) {
                          branches.push(branchName);
                        }
                        lastCommitForIvocation[event.invocationId] = subevent.id;
                        break;
                    }
                  }
                }
              }
            }
          } else if (Schema.is(InvocationTraceEndEvent)(event)) {
            const icon =
              event.outcome === InvocationOutcome.SUCCESS
                ? 'ph--check-circle--regular'
                : event.outcome === InvocationOutcome.FAILURE
                  ? 'ph--x-circle--regular'
                  : 'ph--circle--regular';

            const lastCommit = commits.find((c) => c.id === lastCommitForIvocation[event.invocationId]);
            // Skip invocations that do not have beginning event.
            if (!lastCommit) {
              continue;
            }
            // Collapse invocations with no subevents.
            if (lastCommit?.branch === 'invocations') {
              lastCommit.icon = icon;
              lastCommit.message += ` - ${event.outcome}`;
              continue;
            }

            commits.push({
              id: event.id,
              branch: 'invocations',
              parents: [
                ...(lastCommitForIvocation[event.invocationId] ? [lastCommitForIvocation[event.invocationId]] : []),
                ...(commits.length > 0 ? [commits[commits.length - 1].id] : []),
              ],
              icon,
              message: `${event.outcome}`,
              timestamp: new Date(event.timestamp),
            });
          }
        }

        return { branches, commits };
      }),
  );
};
