//
// Copyright 2023 DXOS.org
//

import { AST, RawObject, S, TypedObject } from '@dxos/echo-schema';

/**
 * Type discriminator for TriggerType.
 * Every spec has a type field of type TriggerKind that we can use to understand which type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export type TriggerKind = 'timer' | 'webhook' | 'websocket' | 'subscription';

const extend = (type: TriggerKind, fields: S.Struct.Fields = {}) =>
  S.extend(
    S.Struct({
      // TODO(burdon): Rename kind.
      type: S.Literal(type).annotations({ [AST.TitleAnnotationId]: 'Trigger type' }),
    }),
    S.Struct(fields),
  ).pipe(S.mutable);

/**
 * Cron timer.
 */
const TimerTriggerSchema = extend('timer', {
  cron: S.String,
});

export type TimerTrigger = S.Schema.Type<typeof TimerTriggerSchema>;

/**
 * Webhook.
 */
const WebhookTriggerSchema = extend('webhook', {
  method: S.String,
  // Assigned port.
  port: S.optional(S.Number),
});

export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;

/**
 * Websocket.
 * @deprecated
 */
const WebsocketTriggerSchema = extend('websocket', {
  url: S.String,
  init: S.optional(S.Record({ key: S.String, value: S.Any })),
});

export type WebsocketTrigger = S.Schema.Type<typeof WebsocketTriggerSchema>;

// TODO(burdon): Use ECHO definition.
const QuerySchema = S.Struct({
  type: S.String,
  props: S.optional(S.Record({ key: S.String, value: S.Any })),
});

/**
 * Subscription.
 */
const SubscriptionTriggerSchema = extend('subscription', {
  // TODO(burdon): Define query DSL (from ECHO). Reconcile with Table.Query.
  filter: S.Array(QuerySchema),
  options: S.optional(
    S.Struct({
      // Watch changes to object (not just creation).
      deep: S.optional(S.Boolean),
      // Debounce changes (delay in ms).
      delay: S.optional(S.Number),
    }),
  ),
});

export type SubscriptionTrigger = S.Schema.Type<typeof SubscriptionTriggerSchema>;

/**
 * Trigger schema (discriminated union).
 */
export const TriggerSchema = S.Union(
  TimerTriggerSchema,
  WebhookTriggerSchema,
  WebsocketTriggerSchema,
  SubscriptionTriggerSchema,
);

export type TriggerType = TimerTrigger | WebhookTrigger | WebsocketTrigger | SubscriptionTrigger;

/**
 * Function trigger.
 */
export const FunctionTriggerSchema = S.Struct({
  function: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Function' })),
  enabled: S.optional(S.Boolean.annotations({ [AST.TitleAnnotationId]: 'Enabled' })),

  // TODO(burdon): Create union?
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
 */
// TODO(burdon): Reconcile with edge.
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
