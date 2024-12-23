//
// Copyright 2023 DXOS.org
//

import { AST, OptionsAnnotationId, RawObject, S, TypedObject } from '@dxos/echo-schema';

/**
 * Type discriminator for TriggerType.
 * Every spec has a type field of type TriggerKind that we can use to understand which type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export enum TriggerKind {
  Timer = 'timer',
  Webhook = 'webhook',
  Subscription = 'subscription',
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
  //
  TimerTriggerSchema,
  WebhookTriggerSchema,
  SubscriptionTriggerSchema,
).annotations({
  [AST.TitleAnnotationId]: 'Trigger',
});

export type TriggerType = S.Schema.Type<typeof TriggerSchema>;

/**
 * Function trigger.
 */
export const FunctionTriggerSchema = S.Struct({
  // TODO(burdon): What type does this reference.
  function: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Function' })),

  enabled: S.optional(S.Boolean.annotations({ [AST.TitleAnnotationId]: 'Enabled' })),

  // TODO(burdon): Flatten entire schema.
  spec: S.optional(TriggerSchema),

  // TODO(burdon): Get meta from function.
  // The `meta` property is merged into the event data passed to the function.
  meta: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
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
