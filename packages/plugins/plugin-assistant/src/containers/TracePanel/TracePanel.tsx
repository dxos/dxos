//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Query } from '@dxos/echo';
import { AtomObj, AtomQuery, AtomRef } from '@dxos/echo-atom';
import { InvocationOutcome, InvocationTraceEndEvent, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { dbg, LogLevel } from '@dxos/log';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Input, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Timeline, type Commit } from '@dxos/react-ui-components';
import { Message, type ContentBlock } from '@dxos/types';

import { extractFirstDxnFromToolInput, extractFirstDxnFromToolResult } from './dxn-extractor';
import { meta } from '#meta';

export const TracePanel = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const { state, start, stop } = useTriggerRuntimeControls(space.db);
  const isRunning = state?.enabled ?? false;

  const { branches, commits } = useAtomValue(useMemo(() => getExecutionGraph(space), [space]));

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
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <div className='flex items-center gap-2'>
              <Input.Switch checked={isRunning} onCheckedChange={isRunning ? stop : start} />
              <Input.Label>{t('trigger-runtime.label')}</Input.Label>
            </div>
          </Input.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Timeline branches={branches} commits={commits} compact onCommitClick={handleCommitClick} />
      </Panel.Content>
    </Panel.Root>
  );
};

type InvocationInfo = {
  startEvent: InvocationTraceStartEvent;
  endEvent: InvocationTraceEndEvent | null;
  subevents: Obj.Unknown[];
};

const getExecutionGraph = (
  space: Space,
  {
    invocationsLimit = 100,
    subeventsLimit = 20,
    showSubeventsForLastNInvocations = 4,
  }: { invocationsLimit?: number; subeventsLimit?: number; showSubeventsForLastNInvocations?: number } = {},
): Atom.Atom<{
  branches: string[];
  commits: Commit[];
}> => {
  return pipe(
    space.properties,
    (_) => AtomObj.make(_),
    // space properies => Atom<Atom<InvocationTraceEvent[]>>
    (_) =>
      Atom.make((get) => {
        const queueDxn = get(_).invocationTraceQueue?.dxn;
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
    // Flatten atoms
    (_) => Atom.make((get) => get(get(_))),
    // Atom<InvocationTraceEvent[]> => Atom<InvocationInfo[]>
    (_) =>
      Atom.make((get) => {
        const events = get(_);
        const invocations: InvocationInfo[] = [];

        for (const event of events) {
          if (Schema.is(InvocationTraceStartEvent)(event)) {
            const invocationInfo: InvocationInfo = {
              startEvent: event,
              endEvent: null,
              subevents: [],
            };
            invocations.push(invocationInfo);
          } else if (Schema.is(InvocationTraceEndEvent)(event)) {
            const invocationInfo = invocations.find((i) => i.startEvent.invocationId === event.invocationId);
            if (invocationInfo) {
              invocationInfo.endEvent = event;
            }
          }
        }

        let expandedBudget = showSubeventsForLastNInvocations;
        for (let i = invocations.length - 1; i >= 0; i--) {
          const invocation = invocations[i];
          if (!invocation.startEvent.invocationTraceQueue) {
            continue;
          }
          const subevents = get(
            AtomQuery.make(
              space.db,
              Query.select(Filter.everything())
                .limit(subeventsLimit)
                .from({ queues: [invocation.startEvent.invocationTraceQueue?.dxn?.toString()] }),
            ),
          );
          invocation.subevents = subevents;
          if (subevents.length > 0) {
            expandedBudget--;
          }
          if (expandedBudget <= 0) {
            break;
          }
        }

        return invocations;
      }),

    // Build commit graph from InvocationInfo[]
    (_) =>
      Atom.make((get) => {
        const invocations = get(_);
        // Two alternating branches for subevents to save horizontal space.
        const branches: string[] = ['invocations'];
        const commits: Commit[] = [];

        const sorted = invocations.sort((a, b) => a.startEvent.timestamp - b.startEvent.timestamp);
        let idx = 0;
        for (const invocation of sorted.slice(-invocationsLimit)) {
          const trigger = invocation.startEvent.trigger && AtomRef.make(invocation.startEvent.trigger).pipe(get);
          const fn =
            (invocation.startEvent.invocationTarget &&
              AtomRef.make(invocation.startEvent.invocationTarget).pipe(get)) ??
            (trigger?.function && AtomRef.make(trigger.function).pipe(get));
          const chat =
            invocation.startEvent.chat && AtomRef.make(invocation.startEvent.chat).pipe(get, AtomObj.make, get);
          dbg(chat);

          const functionName = fn ? Obj.getLabel(fn) : undefined;
          const triggerName = trigger?.spec?.kind ?? 'trigger';
          const label = chat
            ? (Obj.getLabel(chat) ?? 'New Chat')
            : functionName
              ? `${functionName} on ${triggerName}`
              : triggerName;

          const branchName = `invocation-${invocation.startEvent.invocationId.slice(0, 8)}`;

          // Collapse completed invocations with no intermediate events.
          if (invocation.endEvent && invocation.subevents.length === 0) {
            commits.push({
              id: invocation.endEvent.id,
              branch: 'invocations',
              parents: commits.length > 0 ? [commits.at(-1)!.id] : [],
              icon: chat
                ? 'ph--atom--regular'
                : invocation.endEvent.outcome === InvocationOutcome.SUCCESS
                  ? 'ph--check-circle--regular'
                  : 'ph--x-circle--regular',
              link: chat ? Obj.getDXN(chat).toString() : undefined,
              level: invocation.endEvent.outcome === InvocationOutcome.SUCCESS ? LogLevel.INFO : LogLevel.ERROR,
              message: `${label} - ${invocation.endEvent.outcome}`,
              timestamp: new Date(invocation.endEvent.timestamp),
            });
            continue;
          }

          // Start of the invocation.
          commits.push({
            id: invocation.startEvent.id,
            branch: 'invocations',
            parents: commits.length > 0 ? [commits.at(-1)!.id] : [],
            icon: chat ? 'ph--atom--regular' : invocation.endEvent ? 'ph--play--regular' : 'ph--spinner-gap--regular',
            level: invocation.endEvent ? LogLevel.INFO : LogLevel.VERBOSE,
            message: label,
            timestamp: new Date(invocation.startEvent.timestamp),
          });

          // Subevents of the invocation.
          // Track tool call IDs to their corresponding DXNs for linking tool results.
          const toolCallDxns = new Map<string, string>();

          let prevBlockTag: ContentBlock.Any['_tag'] | undefined;
          for (const subevent of invocation.subevents.slice(-subeventsLimit)) {
            if (Obj.instanceOf(Message.Message, subevent)) {
              for (const block of subevent.blocks) {
                switch (block._tag) {
                  case 'text': {
                    if (prevBlockTag === 'text') {
                      continue; // Skip consecutive text blocks.
                    }
                    prevBlockTag = block._tag;
                    commits.push({
                      id: subevent.id,
                      branch: branchName,
                      parents: [commits.at(-1)!.id],
                      icon: subevent.sender.role === 'user' ? 'ph--paper-plane-right--regular' : 'ph--robot--regular',
                      level: LogLevel.VERBOSE,
                      message: block.text.slice(0, 100),
                      timestamp: new Date(subevent.created),
                    });
                    if (!branches.includes(branchName)) {
                      branches.push(branchName);
                    }
                    break;
                  }
                  case 'toolCall': {
                    // Extract DXN from tool call input.
                    const dxn = extractFirstDxnFromToolInput(block.input);
                    const link = dxn?.toString();
                    if (link) {
                      toolCallDxns.set(block.toolCallId, link);
                    }

                    // Only show tool results.
                    // commits.push({
                    //   id: subevent.id,
                    //   branch: branchName,
                    //   parents: [commits.at(-1)!.id],
                    //   icon: 'ph--wrench--regular',
                    //   level: LogLevel.VERBOSE,
                    //   message: block.name,
                    //   timestamp: new Date(subevent.created),
                    //   link,
                    // });
                    // if (!branches.includes(branchName)) {
                    //   branches.push(branchName);
                    // }
                    break;
                  }
                  case 'toolResult': {
                    // Extract DXN from tool result, or use the one from the corresponding tool call.
                    const resultDxn = extractFirstDxnFromToolResult(block.result);
                    const link = resultDxn?.toString() ?? toolCallDxns.get(block.toolCallId);

                    prevBlockTag = block._tag;
                    commits.push({
                      id: `${subevent.id}_toolCall_${block.toolCallId}`,
                      branch: branchName,
                      parents: [commits.at(-1)!.id],
                      icon: 'ph--wrench--regular',
                      level: block.error ? LogLevel.ERROR : LogLevel.VERBOSE,
                      message: block.error ? `${block.name}: ${block.error.slice(0, 50)}` : block.name,
                      timestamp: new Date(subevent.created),
                      link,
                    });
                    if (!branches.includes(branchName)) {
                      branches.push(branchName);
                    }
                    break;
                  }
                  case 'reference': {
                    // Extract DXN from reference block.
                    const refDxn = block.reference?.dxn;
                    const link = refDxn?.toString();

                    commits.push({
                      id: `${subevent.id}_ref`,
                      branch: branchName,
                      parents: [commits.at(-1)!.id],
                      icon: 'ph--link--regular',
                      level: LogLevel.INFO,
                      message: 'Reference',
                      timestamp: new Date(subevent.created),
                      link,
                    });
                    if (!branches.includes(branchName)) {
                      branches.push(branchName);
                    }
                    break;
                  }
                }
              }
            }
          }

          // "Running..." trailing event for invocations that haven't completed.
          if (!invocation.endEvent && invocation.subevents.length > 0) {
            commits.push({
              id: invocation.startEvent.invocationId + 'pending',
              branch: branchName,
              parents: [commits.at(-1)!.id],
              icon: 'ph--dots-three-vertical--regular',
              level: LogLevel.VERBOSE,
              message: 'Running...',
              timestamp: new Date(),
            });
          }

          // End of the invocation, merging back into main. Only if there were subevents.
          if (invocation.endEvent && invocation.subevents.length > 0) {
            commits.push({
              id: invocation.endEvent.id,
              branch: 'invocations',
              parents: Array.dedupe([invocation.startEvent.invocationId, commits.at(-1)!.id]),
              icon:
                invocation.endEvent.outcome === InvocationOutcome.SUCCESS
                  ? 'ph--check-circle--regular'
                  : 'ph--x-circle--regular',
              level: invocation.endEvent.outcome === InvocationOutcome.SUCCESS ? LogLevel.INFO : LogLevel.ERROR,
              message: `${label} - ${invocation.endEvent.outcome === InvocationOutcome.SUCCESS ? 'Success' : 'Failure'}`,
              timestamp: new Date(invocation.endEvent.timestamp),
            });
          }
        }

        // Sort in time order.
        commits.sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));

        return { branches, commits };
      }),
  );
};
