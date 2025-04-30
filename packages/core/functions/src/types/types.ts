//
// Copyright 2023 DXOS.org
//

import { AST, OptionsAnnotationId, RawObject, S, TypedObject, DXN, Ref } from '@dxos/echo-schema';
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
const typeLiteralAnnotations = { [AST.TitleAnnotationId]: 'Type' };

/**
 * Cron timer.
 */
const TimerTriggerSchema = S.Struct({
  type: S.Literal(TriggerKind.Timer).annotations(typeLiteralAnnotations),
  cron: S.String.annotations({
    [AST.TitleAnnotationId]: 'Cron',
    [AST.ExamplesAnnotationId]: ['0 0 * * *'],
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
      [AST.TitleAnnotationId]: 'Method',
      [OptionsAnnotationId]: ['GET', 'POST'],
    }),
  ),
  port: S.optional(
    S.Number.annotations({
      [AST.TitleAnnotationId]: 'Port',
    }),
  ),
}).pipe(S.mutable);

export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;

// TODO(burdon): Use ECHO definition (from https://github.com/dxos/dxos/pull/8233).
const QuerySchema = S.Struct({
  type: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Type' })),
  props: S.optional(S.Record({ key: S.String, value: S.Any })),
}).annotations({ [AST.TitleAnnotationId]: 'Query' });

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
      deep: S.optional(S.Boolean.annotations({ [AST.TitleAnnotationId]: 'Nested' })),
      // Debounce changes (delay in ms).
      delay: S.optional(S.Number.annotations({ [AST.TitleAnnotationId]: 'Delay' })),
    }).annotations({ [AST.TitleAnnotationId]: 'Options' }),
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
  [AST.TitleAnnotationId]: 'Trigger',
});

export type TriggerType = S.Schema.Type<typeof TriggerSchema>;

/**
 * Function trigger.
 * Function is invoked with the `payload` passed as input data.
 * The event that triggers the function is available in the function context.
 */
export const FunctionTriggerSchema = S.Struct({
  /**
   * Function or workflow to invoke.
   */
  // TODO(dmaretskyi): Can also be a Ref(ComputeGraphType).
  function: S.optional(Ref(FunctionType).annotations({ [AST.TitleAnnotationId]: 'Function' })),

  /**
   * Only used for workflows.
   * Specifies the input node in the circuit.
   * @deprecated Remove and enforce a single input node in all compute graphs.
   */
  inputNodeId: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Input Node ID' })),

  enabled: S.optional(S.Boolean.annotations({ [AST.TitleAnnotationId]: 'Enabled' })),

  // TODO(burdon): Flatten entire schema.
  spec: S.optional(TriggerSchema),

  /**
   * Passed as the input data to the function.
   * Must match the function's input schema.
   * This does not get merged with the trigger event.
   */
  payload: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
});

export type FunctionTriggerType = S.Schema.Type<typeof FunctionTriggerSchema>;

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
  uri: S.String,
  description: S.optional(S.String),
  route: S.String,
  handler: S.String,
}) {}

/**
 * Function manifest file.
 */
export const FunctionManifestSchema = S.Struct({
  functions: S.optional(S.mutable(S.Array(RawObject(FunctionDef)))),
  triggers: S.optional(S.mutable(S.Array(RawObject(FunctionTrigger)))),
});

export type FunctionManifest = S.Schema.Type<typeof FunctionManifestSchema>;

export const FUNCTION_TYPES = [FunctionDef, FunctionTrigger];
