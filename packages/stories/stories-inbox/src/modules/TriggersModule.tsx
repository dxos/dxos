//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import React, { useCallback, useRef, useState } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { Operation, Trigger } from '@dxos/compute';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { TriggerDispatcher } from '@dxos/functions-runtime';
import { SyncBinding } from '@dxos/plugin-connector';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { useTriggerRuntimeControls } from '@dxos/plugin-routine/hooks';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ModuleProps } from '@dxos/story-modules';

import { MailboxTriggerRelation } from '../testing';

/** Lists active triggers in the space and exposes manual cron invocation via {@link TriggerDispatcher}. */
export const TriggersModule = ({ space }: ModuleProps) => {
  const triggers = useQuery(
    space.db,
    Query.select(Filter.type(Trigger.Trigger)).debugLabel('stories-inbox.TriggersModule'),
  );
  const { state, start, stop } = useTriggerRuntimeControls(space.db);

  // The mailbox's sync binding is the trigger's input; a trigger can only be created once it exists.
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const bindings = useQuery(
    space.db,
    mailbox ? Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding) : Query.select(Filter.nothing()),
  );
  const binding = bindings.find(SyncBinding.instanceOf);

  // Wire a manual trigger to the Gmail sync operation, linked to the mailbox via `MailboxTriggerRelation`.
  const handleCreateTrigger = useCallback(() => {
    if (!mailbox || !binding) {
      return;
    }

    const trigger = space.db.add(
      Trigger.make({
        [Obj.Parent]: mailbox,
        enabled: true,
        runnable: Ref.make(Operation.serialize(InboxOperation.GoogleMailSync)),
        spec: Trigger.specDirect(),
        input: { binding: Ref.make(binding) },
      }),
    );
    space.db.add(
      Relation.make(MailboxTriggerRelation, {
        [Relation.Source]: mailbox,
        [Relation.Target]: trigger,
      }),
    );
    void space.db.flush();
  }, [space.db, mailbox, binding]);

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
          <Toolbar.Button onClick={handleCreateTrigger} disabled={!binding || triggers.length > 0}>
            Create trigger
          </Toolbar.Button>
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
