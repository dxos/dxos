//
// Copyright 2025 DXOS.org
//

import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Function, type Trigger } from '@dxos/functions';

import { FormBuilder } from '../../../util';

/**
 * Pretty prints a trigger with ANSI colors.
 */
export const printTrigger = Effect.fn(function* (trigger: Trigger.Trigger) {
  const fn = trigger.function && (yield* Database.Service.load(trigger.function));

  return (
    FormBuilder.of({
      title:
        fn && Obj.instanceOf(Function.Function, fn)
          ? (fn.name ?? fn.key ?? fn.id)
          : (trigger.function?.dxn?.toString() ?? 'Unknown'),
    })
      .set({
        key: 'status',
        value: trigger.enabled ? 'enabled' : 'disabled',
        color: trigger.enabled ? Ansi.green : Ansi.blackBright,
      })
      .set({
        key: 'id',
        value: trigger.id,
      })
      .set({
        key: 'kind',
        value: trigger.spec?.kind,
      })
      .set({
        key: 'spec',
        value: trigger.spec && printSpec(trigger.spec),
      })
      // TODO(burdon): Remove?
      // .set({
      //   key: 'input node',
      //   value: trigger.inputNodeId,
      // })
      // .set({
      //   key: 'input',
      //   value: (builder) =>
      //     builder
      //       .each(Object.entries(trigger.input ?? {}), ([key, value]) =>
      //         builder.set({
      //           key,
      //           value: typeof value === 'string' ? value : JSON.stringify(value),
      //         }),
      //       )
      //       .build(),
      // })
      .build()
  );
});

const printSpec = <T extends Trigger.Spec>(spec: T): FormBuilder => {
  switch (spec.kind) {
    case 'timer':
      return printTimer(spec);
    case 'subscription':
      return printSubscription(spec);
    case 'webhook':
      return printWebhook(spec);
    case 'queue':
      return printQueue(spec);
    default:
      return FormBuilder.of({}).set({ key: 'unknown', value: 'Unknown spec type' });
  }
};

const printTimer = (spec: Trigger.TimerSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'cron', value: spec.cron });

const printSubscription = (spec: Trigger.SubscriptionSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'query', value: spec.query?.raw ?? '[Query AST]' });

const printWebhook = (spec: Trigger.WebhookSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'method', value: spec.method })
    .set({ key: 'port', value: spec.port });

const printQueue = (spec: Trigger.QueueSpec) =>
  FormBuilder.of({})
    // prettier-ignore
    .set({ key: 'queue', value: spec.queue });
