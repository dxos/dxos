//
// Copyright 2025 DXOS.org
//

import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Database, Obj } from '@dxos/echo';
import { Function, type Trigger } from '@dxos/functions';

import { FormBuilder } from '../../../util';

/**
 * Gets the trigger kind and detailed spec information.
 */
const getTriggerSpecInfo = (spec: Trigger.Spec | undefined): { kind: string; details: string | undefined } => {
  if (!spec) {
    return { kind: 'No spec defined', details: undefined };
  }

  return Match.value(spec).pipe(
    Match.when({ kind: 'email' }, () => ({
      kind: 'email',
      details: undefined,
    })),
    Match.when({ kind: 'queue' }, (s) => ({
      kind: 'queue',
      details: s.queue ?? 'N/A',
    })),
    Match.when({ kind: 'subscription' }, (s) => ({
      kind: 'subscription',
      details: s.query?.raw ? s.query.raw : '[Query AST]',
    })),
    Match.when({ kind: 'timer' }, (s) => ({
      kind: 'timer',
      details: s.cron,
    })),
    Match.when({ kind: 'webhook' }, (s) => ({
      kind: 'webhook',
      details: `${s.method ?? 'POST'}${s.port ? `:${s.port}` : ''}`,
    })),
    Match.orElse(() => ({
      kind: 'unknown',
      details: undefined,
    })),
  );
};

/**
 * Pretty prints a trigger with ANSI colors.
 */
export const printTrigger = Effect.fn(function* (trigger: Trigger.Trigger) {
  const fn = trigger.function && (yield* Database.Service.load(trigger.function));
  const spec = getTriggerSpecInfo(trigger.spec);

  return FormBuilder.of({
    title:
      fn && Obj.instanceOf(Function.Function, fn)
        ? (fn.name ?? fn.key ?? fn.id)
        : (trigger.function?.dxn?.toString() ?? 'Unknown'),
  })
    .set({
      key: 'id',
      value: trigger.id,
    })
    .set({
      key: 'status',
      value: trigger.enabled ? 'enabled' : 'disabled',
      color: trigger.enabled ? Ansi.green : Ansi.blackBright,
    })
    .set({
      key: 'kind',
      value: spec.kind,
    })
    .set({
      key: 'input node',
      value: trigger.inputNodeId,
    })
    .set({
      key: 'input',
      value: (builder) =>
        builder
          .child()
          .each(Object.entries(trigger.input ?? {}), ([key, value]) =>
            builder.set({
              key,
              value: typeof value === 'string' ? value : JSON.stringify(value),
            }),
          )
          .build(),
    })
    .build();
});
