//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';

const TimerTriggerSchema = S.struct({
  cron: S.string,
});

const WebhookTriggerSchema = S.struct({
  port: S.number,
});

const WebsocketTriggerSchema = S.struct({
  url: S.string,
  init: S.optional(S.record(S.string, S.any)),
});

const SubscriptionTriggerSchema = S.struct({
  spaceKey: S.optional(S.string),
  // TODO(burdon): Define query DSL.
  filter: S.array(
    S.struct({
      type: S.string,
      props: S.optional(S.record(S.string, S.any)),
    }),
  ),
  options: S.optional(
    S.struct({
      // Watch changes to object (not just creation).
      deep: S.optional(S.boolean),
      // Debounce changes (delay in ms).
      delay: S.optional(S.number),
    }),
  ),
});

const FunctionTriggerSchema = S.struct({
  function: S.string.pipe(S.description('Function ID/URI.')),

  // Context passed to function.
  context: S.optional(S.record(S.string, S.any)),

  // Triggers.
  timer: S.optional(TimerTriggerSchema),
  webhook: S.optional(WebhookTriggerSchema),
  websocket: S.optional(WebsocketTriggerSchema),
  subscription: S.optional(SubscriptionTriggerSchema),
});

export type TimerTrigger = S.Schema.Type<typeof TimerTriggerSchema>;
export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;
export type WebsocketTrigger = S.Schema.Type<typeof WebsocketTriggerSchema>;
export type SubscriptionTrigger = S.Schema.Type<typeof SubscriptionTriggerSchema>;
export type FunctionTrigger = S.Schema.Type<typeof FunctionTriggerSchema>;

/**
 * Function definition.
 */
// TODO(burdon): Name vs. path?
const FunctionDefSchema = S.struct({
  id: S.string,
  // name: S.string,
  description: S.optional(S.string),
  path: S.string,
  // TODO(burdon): NPM/GitHub/Docker/CF URL?
  handler: S.string,
});

export type FunctionDef = S.Schema.Type<typeof FunctionDefSchema>;

/**
 * Function manifest file.
 */
export const FunctionManifestSchema = S.struct({
  functions: S.mutable(S.array(FunctionDefSchema)),
  triggers: S.optional(S.mutable(S.array(FunctionTriggerSchema))),
});

export type FunctionManifest = S.Schema.Type<typeof FunctionManifestSchema>;
