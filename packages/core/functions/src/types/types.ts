//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { AST, OptionsAnnotationId, RawObject, TypedObject, DXN } from '@dxos/echo-schema';

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
const typeLiteralAnnotations = { [AST.TitleAnnotationId]: 'Type' };

/**
 * Cron timer.
 */
const TimerTriggerSchema = Schema.Struct({
  type: Schema.Literal(TriggerKind.Timer).annotations(typeLiteralAnnotations),
  cron: Schema.String.annotations({
    [AST.TitleAnnotationId]: 'Cron',
    [AST.ExamplesAnnotationId]: ['0 0 * * *'],
  }),
}).pipe(Schema.mutable);

export type TimerTrigger = Schema.Schema.Type<typeof TimerTriggerSchema>;

const EmailTriggerSchema = Schema.Struct({
  type: Schema.Literal(TriggerKind.Email).annotations(typeLiteralAnnotations),
}).pipe(Schema.mutable);

export type EmailTrigger = Schema.Schema.Type<typeof EmailTriggerSchema>;

const QueueTriggerSchema = Schema.Struct({
  type: Schema.Literal(TriggerKind.Queue).annotations(typeLiteralAnnotations),
  queue: DXN,
}).pipe(Schema.mutable);

export type QueueTrigger = Schema.Schema.Type<typeof QueueTriggerSchema>;

/**
 * Webhook.
 */
const WebhookTriggerSchema = Schema.Struct({
  type: Schema.Literal(TriggerKind.Webhook).annotations(typeLiteralAnnotations),
  method: Schema.optional(
    Schema.String.annotations({
      [AST.TitleAnnotationId]: 'Method',
      [OptionsAnnotationId]: ['GET', 'POST'],
    }),
  ),
  port: Schema.optional(
    Schema.Number.annotations({
      [AST.TitleAnnotationId]: 'Port',
    }),
  ),
}).pipe(Schema.mutable);

export type WebhookTrigger = Schema.Schema.Type<typeof WebhookTriggerSchema>;

// TODO(burdon): Use ECHO definition (from https://github.com/dxos/dxos/pull/8233).
const QuerySchema = Schema.Struct({
  type: Schema.optional(Schema.String.annotations({ [AST.TitleAnnotationId]: 'Type' })),
  props: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
}).annotations({ [AST.TitleAnnotationId]: 'Query' });

/**
 * Subscription.
 */
const SubscriptionTriggerSchema = Schema.Struct({
  type: Schema.Literal(TriggerKind.Subscription).annotations(typeLiteralAnnotations),
  // TODO(burdon): Define query DSL (from ECHO). Reconcile with Table.Query.
  filter: QuerySchema,
  options: Schema.optional(
    Schema.Struct({
      // Watch changes to object (not just creation).
      deep: Schema.optional(Schema.Boolean.annotations({ [AST.TitleAnnotationId]: 'Nested' })),
      // Debounce changes (delay in ms).
      delay: Schema.optional(Schema.Number.annotations({ [AST.TitleAnnotationId]: 'Delay' })),
    }).annotations({ [AST.TitleAnnotationId]: 'Options' }),
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
  [AST.TitleAnnotationId]: 'Trigger',
});

export type TriggerType = Schema.Schema.Type<typeof TriggerSchema>;

/**
 * Function trigger.
 */
export const FunctionTriggerSchema = Schema.Struct({
  // TODO(burdon): What type does this reference.
  // TODO(wittjosiah): This should probably be a Ref?
  function: Schema.optional(Schema.String.annotations({ [AST.TitleAnnotationId]: 'Function' })),

  enabled: Schema.optional(Schema.Boolean.annotations({ [AST.TitleAnnotationId]: 'Enabled' })),

  // TODO(burdon): Flatten entire schema.
  spec: Schema.optional(TriggerSchema),

  // TODO(burdon): Get schema as partial from function.
  // TODO(wittjosiah): Rename to payload.
  // The `meta` property is merged into the event data passed to the function.
  meta: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
});

export type FunctionTriggerType = Schema.Schema.Type<typeof FunctionTriggerSchema>;

/**
 * Function trigger.
 */
export class FunctionTrigger extends TypedObject({
  typename: 'dxos.org/type/FunctionTrigger',
  version: '0.1.0',
})(FunctionTriggerSchema.fields) {}

/**
 * Function definition.
 * @deprecated (Use dxos.org/type/Function)
 */
// TODO(burdon): Reconcile with FunctionType.
export class FunctionDef extends TypedObject({
  typename: 'dxos.org/type/FunctionDef',
  version: '0.1.0',
})({
  uri: Schema.String,
  description: Schema.optional(Schema.String),
  route: Schema.String,
  handler: Schema.String,
}) {}

/**
 * Function manifest file.
 */
export const FunctionManifestSchema = Schema.Struct({
  functions: Schema.optional(Schema.mutable(Schema.Array(RawObject(FunctionDef)))),
  triggers: Schema.optional(Schema.mutable(Schema.Array(RawObject(FunctionTrigger)))),
});

export type FunctionManifest = Schema.Schema.Type<typeof FunctionManifestSchema>;

export const FUNCTION_TYPES = [FunctionDef, FunctionTrigger];
