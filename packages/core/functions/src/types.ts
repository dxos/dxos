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

const SubscriptionTriggerSchema = S.mutable(
  S.Struct({
    type: S.Literal('subscription'),
    // TODO(burdon): Define query DSL (from ECHO).
    filter: S.Array(
      S.Struct({
        type: S.String,
        props: S.optional(S.Record(S.String, S.Any)),
      }),
    ),
    options: S.optional(
      S.Struct({
        // Watch changes to object (not just creation).
        deep: S.optional(S.Boolean),
        // Debounce changes (delay in ms).
        delay: S.optional(S.Number),
      }),
    ),
  }),
);

export type SubscriptionTrigger = S.Schema.Type<typeof SubscriptionTriggerSchema>;

const TimerTriggerSchema = S.mutable(
  S.Struct({
    type: S.Literal('timer'),
    cron: S.String,
  }),
);

export type TimerTrigger = S.Schema.Type<typeof TimerTriggerSchema>;

const WebhookTriggerSchema = S.mutable(
  S.Struct({
    type: S.Literal('webhook'),
    method: S.String,
    // Assigned port.
    port: S.optional(S.Number),
  }),
);

export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;

const WebsocketTriggerSchema = S.mutable(
  S.Struct({
    type: S.Literal('websocket'),
    url: S.String,
    init: S.optional(S.Record(S.String, S.Any)),
  }),
);

export type WebsocketTrigger = S.Schema.Type<typeof WebsocketTriggerSchema>;

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
  enabled: S.optional(S.Boolean),
  function: S.String.pipe(S.description('Function URI.')),
  // The `meta` property is merged into the event data passed to the function.
  meta: S.optional(S.mutable(S.Any)),
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
