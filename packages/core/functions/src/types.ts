//
// Copyright 2023 DXOS.org
//

import { RawObject, S, TypedObject } from '@dxos/echo-schema';

/**
 * Type discriminator for TriggerSpec.
 * Every spec has a type field of type FunctionTriggerType that we can use to understand which
 * type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export type FunctionTriggerType = 'subscription' | 'timer' | 'webhook' | 'websocket';

const TimerTriggerSchema = S.Struct({
  type: S.Literal('timer'),
  cron: S.String,
}).pipe(S.mutable);

export type TimerTrigger = S.Schema.Type<typeof TimerTriggerSchema>;

const WebhookTriggerSchema = S.Struct({
  type: S.Literal('webhook'),
  method: S.String,
  // Assigned port.
  port: S.optional(S.Number),
}).pipe(S.mutable);

export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;

const WebsocketTriggerSchema = S.Struct({
  type: S.Literal('websocket'),
  url: S.String,
  init: S.optional(S.Record({ key: S.String, value: S.Any })),
}).pipe(S.mutable);

export type WebsocketTrigger = S.Schema.Type<typeof WebsocketTriggerSchema>;

const QuerySchema = S.Struct({
  type: S.String,
  props: S.optional(S.Record({ key: S.String, value: S.Any })),
});

const SubscriptionTriggerSchema = S.Struct({
  type: S.Literal('subscription'),
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
}).pipe(S.mutable);

export type SubscriptionTrigger = S.Schema.Type<typeof SubscriptionTriggerSchema>;

const TriggerSpecSchema = S.Union(
  TimerTriggerSchema,
  WebhookTriggerSchema,
  WebsocketTriggerSchema,
  SubscriptionTriggerSchema,
);

export type TriggerSpec = TimerTrigger | WebhookTrigger | WebsocketTrigger | SubscriptionTrigger;

/**
 * Function definition.
 */
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
 * Function trigger.
 */
export class FunctionTrigger extends TypedObject({
  typename: 'dxos.org/type/FunctionTrigger',
  version: '0.1.0',
})({
  name: S.optional(S.String),
  enabled: S.optional(S.Boolean),
  function: S.String.pipe(S.annotations({ description: 'Function URI.' })),
  // The `meta` property is merged into the event data passed to the function.
  meta: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
  spec: TriggerSpecSchema,
}) {}

/**
 * Function manifest file.
 */
export const FunctionManifestSchema = S.Struct({
  functions: S.optional(S.mutable(S.Array(RawObject(FunctionDef)))),
  triggers: S.optional(S.mutable(S.Array(RawObject(FunctionTrigger)))),
});

export type FunctionManifest = S.Schema.Type<typeof FunctionManifestSchema>;

// TODO(burdon): Standards?
export const FUNCTION_SCHEMA = [FunctionDef, FunctionTrigger];
