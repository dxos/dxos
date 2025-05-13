//
// Copyright 2023 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Expando, OptionsAnnotationId, RawObject, TypedObject, DXN, Ref } from '@dxos/echo-schema';

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
const TimerTriggerSchema = Schema.Struct({
  type: Schema.Literal(TriggerKind.Timer).annotations(typeLiteralAnnotations),
  cron: Schema.String.annotations({
    [SchemaAST.TitleAnnotationId]: 'Cron',
    [SchemaAST.ExamplesAnnotationId]: ['0 0 * * *'],
  }),
  /**
   * Passed as the input data to the function.
   * Must match the function's input schema.
   * This does not get merged with the trigger event.
   */
  payload: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
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
  type: Schema.Literal(TriggerKind.Subscription).annotations(typeLiteralAnnotations),
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
  function: S.optional(Ref(Expando).annotations({ [AST.TitleAnnotationId]: 'Function' })),

  /**
   * Only used for workflows.
   * Specifies the input node in the circuit.
   * @deprecated Remove and enforce a single input node in all compute graphs.
   */
  inputNodeId: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Input Node ID' })),

  enabled: Schema.optional(Schema.Boolean.annotations({ [SchemaAST.TitleAnnotationId]: 'Enabled' })),

  // TODO(burdon): Flatten entire schema.
  spec: Schema.optional(TriggerSchema),
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
