//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Obj, QueryAST, Type } from '@dxos/echo';
import { Expando, OptionsAnnotationId, Ref } from '@dxos/echo/internal';
import { DXN } from '@dxos/keys';

/**
 * Type discriminator for TriggerType.
 * Every spec has a type field of type TriggerKind that we can use to understand which type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export const Kinds = ['timer', 'webhook', 'subscription', 'email', 'queue'] as const;
export type Kind = (typeof Kinds)[number];

const kindLiteralAnnotations = { title: 'Kind' };

/**
 * Cron timer.
 */
export const TimerSpec = Schema.Struct({
  kind: Schema.Literal('timer').annotations(kindLiteralAnnotations),
  cron: Schema.String.annotations({
    title: 'Cron',
    [SchemaAST.ExamplesAnnotationId]: ['0 0 * * *'],
  }),
}).pipe(Schema.mutable);
export type TimerSpec = Schema.Schema.Type<typeof TimerSpec>;

export const EmailSpec = Schema.Struct({
  kind: Schema.Literal('email').annotations(kindLiteralAnnotations),
}).pipe(Schema.mutable);
export type EmailSpec = Schema.Schema.Type<typeof EmailSpec>;

export const QueueSpec = Schema.Struct({
  kind: Schema.Literal('queue').annotations(kindLiteralAnnotations),

  // TODO(dmaretskyi): Change to a reference.
  queue: DXN.Schema,
}).pipe(Schema.mutable);
export type QueueSpec = Schema.Schema.Type<typeof QueueSpec>;

/**
 * Webhook.
 */
export const WebhookSpec = Schema.Struct({
  kind: Schema.Literal('webhook').annotations(kindLiteralAnnotations),
  method: Schema.optional(
    Schema.String.annotations({
      title: 'Method',
      [OptionsAnnotationId]: ['GET', 'POST'],
    }),
  ),
  port: Schema.optional(
    Schema.Number.annotations({
      title: 'Port',
    }),
  ),
}).pipe(Schema.mutable);
export type WebhookSpec = Schema.Schema.Type<typeof WebhookSpec>;

/**
 * Subscription.
 */
export const SubscriptionSpec = Schema.Struct({
  kind: Schema.Literal('subscription').annotations(kindLiteralAnnotations),
  query: Schema.Struct({
    raw: Schema.optional(Schema.String.annotations({ title: 'Query' })),
    ast: QueryAST.Query,
  }).pipe(Schema.mutable),
  options: Schema.optional(
    Schema.Struct({
      // Watch changes to object (not just creation).
      deep: Schema.optional(Schema.Boolean.annotations({ title: 'Nested' })),
      // Debounce changes (delay in ms).
      delay: Schema.optional(Schema.Number.annotations({ title: 'Delay' })),
    }).annotations({ title: 'Options' }),
  ),
}).pipe(Schema.mutable);
export type SubscriptionSpec = Schema.Schema.Type<typeof SubscriptionSpec>;

/**
 * Trigger schema (discriminated union).
 */
export const Spec = Schema.Union(TimerSpec, WebhookSpec, SubscriptionSpec, EmailSpec, QueueSpec).annotations({
  title: 'Trigger',
});
export type Spec = Schema.Schema.Type<typeof Spec>;

/**
 * Function trigger.
 * Function is invoked with the `payload` passed as input data.
 * The event that triggers the function is available in the function context.
 */
const Trigger_ = Schema.Struct({
  /**
   * Function or workflow to invoke.
   */
  // TODO(dmaretskyi): Can be a Ref(FunctionType) or Ref(ComputeGraphType).
  function: Schema.optional(Ref(Expando).annotations({ title: 'Function' })),

  /**
   * Only used for workflowSchema.
   * Specifies the input node in the circuit.
   * @deprecated Remove and enforce a single input node in all compute graphSchema.
   */
  inputNodeId: Schema.optional(Schema.String.annotations({ title: 'Input Node ID' })),

  enabled: Schema.optional(Schema.Boolean.annotations({ title: 'Enabled' })),

  spec: Schema.optional(Spec),

  /**
   * Passed as the input data to the function.
   * Must match the function's input schema.
   *
   * @example
   * {
   *   item: '{{$.trigger.event}}',
   *   instructions: 'Summarize and perform entity-extraction'
   *   mailbox: { '/': 'dxn:echo:AAA:ZZZ' }
   * }
   */
  input: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Trigger',
    version: '0.1.0',
  }),
);
export interface Trigger extends Schema.Schema.Type<typeof Trigger_> {}
export interface TriggerEncoded extends Schema.Schema.Encoded<typeof Trigger_> {}
export const Trigger: Schema.Schema<Trigger, TriggerEncoded> = Trigger_;

export const make = (props: Obj.MakeProps<typeof Trigger>) => Obj.make(Trigger, props);
