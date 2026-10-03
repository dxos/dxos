//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import React, { useCallback, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as Trigger from '@dxos/compute/Trigger';
import { Filter, Obj, Query } from '@dxos/echo';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as RoutineHooks from '@dxos/plugin-routine/Hooks';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Switch from '@dxos/react-ui/Switch';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/**
 * Lists active triggers in the space and exposes manual cron invocation via {@link TriggerDispatcher}.
 * Triggers are created solely by the connector integration (the sync toggle → {@link Binding.createRoutine}),
 * so this panel only observes and invokes them.
 */
export const TriggersModule = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <TriggersModuleContainer space={space} />;
};

const TriggersModuleContainer = ({ space }: { space: Space }) => {
  const triggers = useQuery(
    space.db,
    Query.select(Filter.type(Trigger.Trigger)).debugLabel('stories-inbox.TriggersModule'),
  );
  const { state, start, stop } = RoutineHooks.useTriggerRuntimeControls(space.db);

  const [invokingId, setInvokingId] = useState<string | undefined>();
  const triggerToInvokeRef = useRef<Trigger.Trigger | undefined>(undefined);

  // Invoke via the aggregate monitor (not the local dispatcher directly) so a trigger marked
  // `remote` is routed to the EDGE dispatcher, while a local trigger runs in-process.
  const invokeTrigger = Hooks.useSpaceCallback(
    space.db.spaceId,
    [Trigger.TriggerMonitorService],
    Effect.fnUntraced(function* () {
      const trigger = triggerToInvokeRef.current;
      if (!trigger) {
        return;
      }

      const monitor = yield* Trigger.TriggerMonitorService;
      yield* monitor.invokeTrigger({
        trigger,
        event: { tick: Date.now() },
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
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Triggers</Toolbar.Text>
          <Toolbar.Separator />
          <Button.Button onClick={start} disabled={state?.enabled}>
            Start dispatcher
          </Button.Button>
          <Button.Button onClick={stop} disabled={!state?.enabled}>
            Stop dispatcher
          </Button.Button>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex flex-col gap-2 p-2 text-sm overflow-auto'>
        <JsonHighlighter
          data={{
            dispatcher: state?.enabled ? 'running' : 'stopped',
            invocations: state?.invocations.length ?? 0,
            errors: state?.errors.length ?? 0,
          }}
        />
        {activeTriggers.length === 0 ? (
          <div className='text-fg-muted'>No active triggers in this space.</div>
        ) : (
          <ul className='flex flex-col gap-2'>
            {activeTriggers.map((trigger) => {
              const lastInvocation = state?.invocations.findLast((invocation) => invocation.trigger.id === trigger.id);
              return (
                <li key={trigger.id} className='flex flex-col gap-1 rounded border border-separator p-2'>
                  <div className='font-mono text-xs truncate'>{trigger.id}</div>
                  <div className='text-fg-muted'>{formatTriggerSpec(trigger)}</div>
                  <Switch.Switch
                    checked={trigger.remote === true}
                    onCheckedChange={({ checked }) => {
                      Obj.update(trigger, (trigger) => {
                        trigger.remote = checked;
                      });
                    }}
                    label={trigger.remote ? 'Remote (edge)' : 'Local'}
                  />
                  {lastInvocation && (
                    <div className='text-xs'>
                      Last run: {formatInvocationResult(lastInvocation.result)}
                      {lastInvocation.function?.meta.name ? ` (${lastInvocation.function.meta.name})` : ''}
                    </div>
                  )}
                  {Trigger.isManuallyInvokable(trigger.spec) && (
                    <Button.Button
                      onClick={() => handleInvoke(trigger)}
                      disabled={!state?.enabled || invokingId === trigger.id}
                    >
                      {invokingId === trigger.id ? 'Invoking…' : 'Invoke now'}
                    </Button.Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel.Body>
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
