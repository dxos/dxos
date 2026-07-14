//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import React, { useCallback, useRef, useState } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { Trigger } from '@dxos/compute';
import { Filter, Query } from '@dxos/echo';
import { TriggerDispatcher } from '@dxos/functions-runtime';
import { useTriggerRuntimeControls } from '@dxos/plugin-routine/hooks';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ModuleProps } from '@dxos/story-modules';

/** Lists active triggers in the space and exposes manual cron invocation via {@link TriggerDispatcher}. */
export const TriggersModule = ({ space }: ModuleProps) => {
  const triggers = useQuery(
    space.db,
    Query.select(Filter.type(Trigger.Trigger)).debugLabel('stories-inbox.TriggersModule'),
  );
  const { state, start, stop } = useTriggerRuntimeControls(space.db);

  const [invokingId, setInvokingId] = useState<string | undefined>();
  const triggerToInvokeRef = useRef<Trigger.Trigger | undefined>(undefined);

  const invokeTrigger = useSpaceCallback(
    space.db.spaceId,
    [TriggerDispatcher],
    Effect.fnUntraced(function* () {
      const trigger = triggerToInvokeRef.current;
      if (!trigger) {
        return;
      }

      const dispatcher = yield* TriggerDispatcher;
      const now = new Date();
      yield* dispatcher.invokeTrigger({
        trigger,
        event: { tick: now.getTime() },
      });
    }),
  );

  const handleInvoke = useCallback(
    (trigger: Trigger.Trigger) => {
      triggerToInvokeRef.current = trigger;
      setInvokingId(trigger.id);
      void invokeTrigger().finally(() => setInvokingId(undefined));
    },
    [invokeTrigger],
  );

  const activeTriggers = triggers.filter((trigger) => trigger.enabled);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Triggers</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.Button onClick={start} disabled={state?.enabled}>
            Start dispatcher
          </Toolbar.Button>
          <Toolbar.Button onClick={stop} disabled={!state?.enabled}>
            Stop dispatcher
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='flex flex-col gap-2 p-2 text-sm overflow-auto'>
        <JsonHighlighter
          data={{
            dispatcher: state?.enabled ? 'running' : 'stopped',
            invocations: state?.invocations.length ?? 0,
            errors: state?.errors.length ?? 0,
          }}
        />
        {activeTriggers.length === 0 ? (
          <div className='text-description'>No active triggers in this space.</div>
        ) : (
          <ul className='flex flex-col gap-2'>
            {activeTriggers.map((trigger) => {
              const lastInvocation = state?.invocations.findLast((invocation) => invocation.trigger.id === trigger.id);
              return (
                <li key={trigger.id} className='flex flex-col gap-1 rounded border border-separator p-2'>
                  <div className='font-mono text-xs truncate'>{trigger.id}</div>
                  <div className='text-description'>{formatTriggerSpec(trigger)}</div>
                  {lastInvocation && (
                    <div className='text-xs'>
                      Last run: {formatInvocationResult(lastInvocation.result)}
                      {lastInvocation.function?.meta.name ? ` (${lastInvocation.function.meta.name})` : ''}
                    </div>
                  )}
                  {Trigger.isManuallyInvokable(trigger.spec) && (
                    <Button
                      onClick={() => handleInvoke(trigger)}
                      disabled={!state?.enabled || invokingId === trigger.id}
                    >
                      {invokingId === trigger.id ? 'Invoking…' : 'Invoke now'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const formatTriggerSpec = (trigger: Trigger.Trigger): string => {
  const spec = trigger.spec;
  if (!spec) {
    return 'unknown';
  }

  switch (spec.kind) {
    case 'timer':
      return `cron: ${spec.cron}`;
    case 'feed':
      return 'feed';
    case 'subscription':
      return 'subscription';
    default:
      return spec.kind;
  }
};

const formatInvocationResult = (result: Exit.Exit<unknown> | null): string => {
  if (!result) {
    return 'pending';
  }

  return Exit.isSuccess(result) ? 'success' : 'failure';
};
