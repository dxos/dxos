//
// Copyright 2023 DXOS.org
//

import { Schema as S, SchemaAST } from 'effect';

import { Expando, OptionsAnnotationId, TypedObject, DXN, Ref, RawObject } from '@dxos/echo-schema';

import { FunctionType } from './schema';

/**
 * Type discriminator for TriggerType.
 * Every spec has a type field of type TriggerKind that we can use to understand which type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export enum TriggerKind {
  Timer = 'timer',
  Webhook = 'webhook',
  Subscription = 'subscription',
  Email = 'email',
  Queue = 'queue',
}

// TODO(burdon): Rename prop kind.
const typeLiteralAnnotations = { [SchemaAST.TitleAnnotationId]: 'Type' };

/**
 * Cron timer.
 */
const TimerTriggerSchema = S.Struct({
  type: S.Literal(TriggerKind.Timer).annotations(typeLiteralAnnotations),
  cron: S.String.annotations({
    [SchemaAST.TitleAnnotationId]: 'Cron',
    [SchemaAST.ExamplesAnnotationId]: ['0 0 * * *'],
  }),
}).pipe(S.mutable);

export type TimerTrigger = S.Schema.Type<typeof TimerTriggerSchema>;

const EmailTriggerSchema = S.Struct({
  type: S.Literal(TriggerKind.Email).annotations(typeLiteralAnnotations),
}).pipe(S.mutable);

export type EmailTrigger = S.Schema.Type<typeof EmailTriggerSchema>;

const QueueTriggerSchema = S.Struct({
  type: S.Literal(TriggerKind.Queue).annotations(typeLiteralAnnotations),
  queue: DXN,
}).pipe(S.mutable);

export type QueueTrigger = S.Schema.Type<typeof QueueTriggerSchema>;

/**
 * Webhook.
 */
const WebhookTriggerSchema = S.Struct({
  type: S.Literal(TriggerKind.Webhook).annotations(typeLiteralAnnotations),
  method: S.optional(
    S.String.annotations({
      [SchemaAST.TitleAnnotationId]: 'Method',
      [OptionsAnnotationId]: ['GET', 'POST'],
    }),
  ),
  port: S.optional(
    S.Number.annotations({
      [SchemaAST.TitleAnnotationId]: 'Port',
    }),
  ),
}).pipe(S.mutable);

export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;

// TODO(burdon): Use ECHO definition (from https://github.com/dxos/dxos/pull/8233).
const QuerySchema = S.Struct({
  type: S.optional(S.String.annotations({ [SchemaAST.TitleAnnotationId]: 'Type' })),
  props: S.optional(S.Record({ key: S.String, value: S.Any })),
}).annotations({ [SchemaAST.TitleAnnotationId]: 'Query' });

/**
 * Subscription.
 */
const SubscriptionTriggerSchema = S.Struct({
  type: S.Literal(TriggerKind.Subscription).annotations(typeLiteralAnnotations),
  // TODO(burdon): Define query DSL (from ECHO). Reconcile with Table.Query.
  filter: QuerySchema,
  options: S.optional(
    S.Struct({
      // Watch changes to object (not just creation).
      deep: S.optional(S.Boolean.annotations({ [SchemaAST.TitleAnnotationId]: 'Nested' })),
      // Debounce changes (delay in ms).
      delay: S.optional(S.Number.annotations({ [SchemaAST.TitleAnnotationId]: 'Delay' })),
    }).annotations({ [SchemaAST.TitleAnnotationId]: 'Options' }),
  ),
}).pipe(S.mutable);

export type SubscriptionTrigger = S.Schema.Type<typeof SubscriptionTriggerSchema>;

/**
 * Trigger schema (discriminated union).
 */
export const TriggerSchema = S.Union(
  TimerTriggerSchema,
  WebhookTriggerSchema,
  SubscriptionTriggerSchema,
  EmailTriggerSchema,
  QueueTriggerSchema,
).annotations({
  [SchemaAST.TitleAnnotationId]: 'Trigger',
});
export type TriggerType = S.Schema.Type<typeof TriggerSchema>;

export type EventType =
  | EmailTriggerOutput
  | WebhookTriggerOutput
  | QueueTriggerOutput
  | SubscriptionTriggerOutput
  | TimerTriggerOutput;

// TODO(burdon): Reuse trigger schema from @dxos/functions (TriggerType).
export const EmailTriggerOutput = S.mutable(
  S.Struct({
    from: S.String,
    to: S.String,
    subject: S.String,
    created: S.String,
    body: S.String,
  }),
);
export type EmailTriggerOutput = S.Schema.Type<typeof EmailTriggerOutput>;

export const WebhookTriggerOutput = S.mutable(
  S.Struct({
    url: S.String,
    method: S.Literal('GET', 'POST'),
    headers: S.Record({ key: S.String, value: S.String }),
    bodyText: S.String,
  }),
);
export type WebhookTriggerOutput = S.Schema.Type<typeof WebhookTriggerOutput>;

export const QueueTriggerOutput = S.mutable(
  S.Struct({
    queue: DXN,
    item: S.Any,
    cursor: S.String,
  }),
);
export type QueueTriggerOutput = S.Schema.Type<typeof QueueTriggerOutput>;

export const SubscriptionTriggerOutput = S.mutable(S.Struct({ type: S.String, changedObjectId: S.String }));
export type SubscriptionTriggerOutput = S.Schema.Type<typeof SubscriptionTriggerOutput>;

export const TimerTriggerOutput = S.mutable(S.Struct({ tick: S.Number }));
export type TimerTriggerOutput = S.Schema.Type<typeof TimerTriggerOutput>;

/**
 * Function trigger.
 * Function is invoked with the `payload` passed as input data.
 * The event that triggers the function is available in the function context.
 */
export const FunctionTriggerSchema = S.Struct({
  /**
   * Function or workflow to invoke.
   */
  // TODO(dmaretskyi): Can be a Ref(FunctionType) or Ref(ComputeGraphType).
  function: S.optional(Ref(Expando).annotations({ [SchemaAST.TitleAnnotationId]: 'Function' })),

  /**
   * Only used for workflows.
   * Specifies the input node in the circuit.
   * @deprecated Remove and enforce a single input node in all compute graphs.
   */
  inputNodeId: S.optional(S.String.annotations({ [SchemaAST.TitleAnnotationId]: 'Input Node ID' })),

  enabled: S.optional(S.Boolean.annotations({ [SchemaAST.TitleAnnotationId]: 'Enabled' })),

  spec: S.optional(TriggerSchema),

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
  input: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
});

export type FunctionTriggerType = S.Schema.Type<typeof FunctionTriggerSchema>;

/**
 * Function trigger.
 */
export class FunctionTrigger extends TypedObject({
  typename: 'dxos.org/type/FunctionTrigger',
  version: '0.1.0',
})(FunctionTriggerSchema.fields) {}

// TODO(wittjosiah): Remove?

/**
 * Function manifest file.
 */
export const FunctionManifestSchema = S.Struct({
  functions: S.optional(S.mutable(S.Array(RawObject(FunctionType)))),
  triggers: S.optional(S.mutable(S.Array(RawObject(FunctionTrigger)))),
});
export type FunctionManifest = S.Schema.Type<typeof FunctionManifestSchema>;

export const FUNCTION_TYPES = [FunctionType, FunctionTrigger];
