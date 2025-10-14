//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Obj, QueryAST, Type } from '@dxos/echo';
import { Expando, OptionsAnnotationId, RawObject, Ref } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';

import { FunctionType } from './schema';

/**
 * Type discriminator for TriggerType.
 * Every spec has a type field of type TriggerKind that we can use to understand which type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export const TriggerKinds = ['timer', 'webhook', 'subscription', 'email', 'queue'] as const;
export type TriggerKind = (typeof TriggerKinds)[number];

const kindLiteralAnnotations = { title: 'Kind' };

/**
 * Cron timer.
 */
const TimerTriggerSchema = Schema.Struct({
  kind: Schema.Literal('timer').annotations(kindLiteralAnnotations),
  cron: Schema.String.annotations({
    title: 'Cron',
    [SchemaAST.ExamplesAnnotationId]: ['0 0 * * *'],
  }),
}).pipe(Schema.mutable);
export type TimerTrigger = Schema.Schema.Type<typeof TimerTriggerSchema>;

const EmailTriggerSchema = Schema.Struct({
  kind: Schema.Literal('email').annotations(kindLiteralAnnotations),
}).pipe(Schema.mutable);
export type EmailTrigger = Schema.Schema.Type<typeof EmailTriggerSchema>;

const QueueTriggerSchema = Schema.Struct({
  kind: Schema.Literal('queue').annotations(kindLiteralAnnotations),

  // TODO(dmaretskyi): Change to a reference.
  queue: DXN.Schema,
}).pipe(Schema.mutable);
export type QueueTrigger = Schema.Schema.Type<typeof QueueTriggerSchema>;

/**
 * Webhook.
 */
const WebhookTriggerSchema = Schema.Struct({
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
export type WebhookTrigger = Schema.Schema.Type<typeof WebhookTriggerSchema>;

/**
 * Subscription.
 */
const SubscriptionTriggerSchema = Schema.Struct({
  kind: Schema.Literal('subscription').annotations(kindLiteralAnnotations),
  query: Schema.Struct({
    string: Schema.optional(Schema.String.annotations({ title: 'Query' })),
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
  title: 'Trigger',
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
    queue: DXN.Schema,
    item: Schema.Any,
    cursor: Schema.String,
  }),
);
export type QueueTriggerOutput = Schema.Schema.Type<typeof QueueTriggerOutput>;

export const SubscriptionTriggerOutput = Schema.Struct({
  /**
   * Type of the mutation.
   */
  // TODO(dmaretskyi): Specify enum.
  type: Schema.String,

  /**
   * Reference to the object that was changed or created.
   */
  subject: Type.Ref(Obj.Any),

  /**
   * @deprecated
   */
  changedObjectId: Schema.optional(Schema.String),
}).pipe(Schema.mutable);
export type SubscriptionTriggerOutput = Schema.Schema.Type<typeof SubscriptionTriggerOutput>;

export const TimerTriggerOutput = Schema.mutable(Schema.Struct({ tick: Schema.Number }));
export type TimerTriggerOutput = Schema.Schema.Type<typeof TimerTriggerOutput>;

/**
 * Function trigger.
 * Function is invoked with the `payload` passed as input data.
 * The event that triggers the function is available in the function context.
 */
const FunctionTrigger_ = Schema.Struct({
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
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/FunctionTrigger',
    version: '0.2.0',
  }),
);
export interface FunctionTrigger extends Schema.Schema.Type<typeof FunctionTrigger_> {}
export interface FunctionTriggerEncoded extends Schema.Schema.Encoded<typeof FunctionTrigger_> {}
export const FunctionTrigger: Schema.Schema<FunctionTrigger, FunctionTriggerEncoded> = FunctionTrigger_;

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
