//
// Copyright 2023 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

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

const kindLiteralAnnotations = { [SchemaAST.TitleAnnotationId]: 'Kind' };

/**
 * Cron timer.
 */
const TimerTriggerSchema = Schema.Struct({
  kind: Schema.Literal(TriggerKind.Timer).annotations(kindLiteralAnnotations),
  cron: Schema.String.annotations({
    [SchemaAST.TitleAnnotationId]: 'Cron',
    [SchemaAST.ExamplesAnnotationId]: ['0 0 * * *'],
  }),
}).pipe(Schema.mutable);
export type TimerTrigger = Schema.Schema.Type<typeof TimerTriggerSchema>;

const EmailTriggerSchema = Schema.Struct({
  kind: Schema.Literal(TriggerKind.Email).annotations(kindLiteralAnnotations),
}).pipe(Schema.mutable);
export type EmailTrigger = Schema.Schema.Type<typeof EmailTriggerSchema>;

const QueueTriggerSchema = Schema.Struct({
  kind: Schema.Literal(TriggerKind.Queue).annotations(kindLiteralAnnotations),
  queue: DXN,
}).pipe(Schema.mutable);
export type QueueTrigger = Schema.Schema.Type<typeof QueueTriggerSchema>;

/**
 * Webhook.
 */
const WebhookTriggerSchema = Schema.Struct({
  kind: Schema.Literal(TriggerKind.Webhook).annotations(kindLiteralAnnotations),
  method: Schema.optional(
    Schema.String.annotations({
      [SchemaAST.TitleAnnotationId]: 'Method',
      [OptionsAnnotationId]: ['GET', 'POST'],
    }),
  ),
  port: Schema.optional(
    Schema.Number.annotations({
      [SchemaAST.TitleAnnotationId]: 'Port',
    }),
  ),
}).pipe(Schema.mutable);
export type WebhookTrigger = Schema.Schema.Type<typeof WebhookTriggerSchema>;

// TODO(burdon): Use ECHO definition (from https://github.com/dxos/dxos/pull/8233).
const QuerySchema = Schema.Struct({
  type: Schema.optional(Schema.String.annotations({ [SchemaAST.TitleAnnotationId]: 'Type' })),
  props: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
}).annotations({ [SchemaAST.TitleAnnotationId]: 'Query' });

/**
 * Subscription.
 */
const SubscriptionTriggerSchema = Schema.Struct({
  kind: Schema.Literal(TriggerKind.Subscription).annotations(kindLiteralAnnotations),
  // TODO(burdon): Define query DSL (from ECHO). Reconcile with Table.Query.
  filter: QuerySchema,
  options: Schema.optional(
    Schema.Struct({
      // Watch changes to object (not just creation).
      deep: Schema.optional(Schema.Boolean.annotations({ [SchemaAST.TitleAnnotationId]: 'Nested' })),
      // Debounce changes (delay in ms).
      delay: Schema.optional(Schema.Number.annotations({ [SchemaAST.TitleAnnotationId]: 'Delay' })),
    }).annotations({ [SchemaAST.TitleAnnotationId]: 'Options' }),
  ),
}).pipe(Schema.mutable);
export type SubscriptionTrigger = Schema.Schema.Type<typeof SubscriptionTriggerSchema>;

/**
 * Trigger schema (discriminated union).
 */
export const TriggerSchema = Schema.Union(
  TimerTriggerSchema,
  WebhookTriggerSchema,
  SubscriptionTriggerSchema,
  EmailTriggerSchema,
  QueueTriggerSchema,
).annotations({
  [SchemaAST.TitleAnnotationId]: 'Trigger',
});
export type TriggerType = Schema.Schema.Type<typeof TriggerSchema>;

export type EventType =
  | EmailTriggerOutput
  | WebhookTriggerOutput
  | QueueTriggerOutput
  | SubscriptionTriggerOutput
  | TimerTriggerOutput;

// TODO(burdon): Reuse trigger schema from @dxos/functions (TriggerType).
export const EmailTriggerOutput = Schema.mutable(
  Schema.Struct({
    from: Schema.String,
    to: Schema.String,
    subject: Schema.String,
    created: Schema.String,
    body: Schema.String,
  }),
);
export type EmailTriggerOutput = Schema.Schema.Type<typeof EmailTriggerOutput>;

export const WebhookTriggerOutput = Schema.mutable(
  Schema.Struct({
    url: Schema.String,
    method: Schema.Literal('GET', 'POST'),
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    bodyText: Schema.String,
  }),
);
export type WebhookTriggerOutput = Schema.Schema.Type<typeof WebhookTriggerOutput>;

export const QueueTriggerOutput = Schema.mutable(
  Schema.Struct({
    queue: DXN,
    item: Schema.Any,
    cursor: Schema.String,
  }),
);
export type QueueTriggerOutput = Schema.Schema.Type<typeof QueueTriggerOutput>;

export const SubscriptionTriggerOutput = Schema.mutable(
  Schema.Struct({ type: Schema.String, changedObjectId: Schema.String }),
);
export type SubscriptionTriggerOutput = Schema.Schema.Type<typeof SubscriptionTriggerOutput>;

export const TimerTriggerOutput = Schema.mutable(Schema.Struct({ tick: Schema.Number }));
export type TimerTriggerOutput = Schema.Schema.Type<typeof TimerTriggerOutput>;

/**
 * Function trigger.
 * Function is invoked with the `payload` passed as input data.
 * The event that triggers the function is available in the function context.
 */
export const FunctionTriggerSchema = Schema.Struct({
  /**
   * Function or workflow to invoke.
   */
  // TODO(dmaretskyi): Can be a Ref(FunctionType) or Ref(ComputeGraphType).
  function: Schema.optional(Ref(Expando).annotations({ [SchemaAST.TitleAnnotationId]: 'Function' })),

  /**
   * Only used for workflowSchema.
   * Specifies the input node in the circuit.
   * @deprecated Remove and enforce a single input node in all compute graphSchema.
   */
  inputNodeId: Schema.optional(Schema.String.annotations({ [SchemaAST.TitleAnnotationId]: 'Input Node ID' })),

  enabled: Schema.optional(Schema.Boolean.annotations({ [SchemaAST.TitleAnnotationId]: 'Enabled' })),

  spec: Schema.optional(TriggerSchema),

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
});

export type FunctionTriggerType = Schema.Schema.Type<typeof FunctionTriggerSchema>;

/**
 * Function trigger.
 */
export class FunctionTrigger extends TypedObject({
  typename: 'dxoSchema.org/type/FunctionTrigger',
  version: '0.1.0',
})(FunctionTriggerSchema.fields) {}

// TODO(wittjosiah): Remove?

/**
 * Function manifest file.
 */
export const FunctionManifestSchema = Schema.Struct({
  functions: Schema.optional(Schema.mutable(Schema.Array(RawObject(FunctionType)))),
  triggers: Schema.optional(Schema.mutable(Schema.Array(RawObject(FunctionTrigger)))),
});
export type FunctionManifest = Schema.Schema.Type<typeof FunctionManifestSchema>;

export const FUNCTION_TYPES = [FunctionType, FunctionTrigger];
