//
// Copyright 2023 DXOS.org
//

import { AST, type ObjectMeta, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Reconcile with echo-schema and cli-composer.
export const ECHO_ATTR_META = '@meta';

export const splitMeta = <T>(object: T & { [ECHO_ATTR_META]?: ObjectMeta }): { object: T; meta?: ObjectMeta } => {
  const meta = object[ECHO_ATTR_META];
  delete object[ECHO_ATTR_META];
  return { meta, object };
};

/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
// TODO(burdon): Factor out.
const RawObject = <T>(schema: S.Schema<T>): S.Schema<Omit<T, 'id'> & { [ECHO_ATTR_META]?: ObjectMeta }> => {
  return S.make(AST.omit(schema.ast, ['id']));
};

/**
 * Type discriminator for TriggerSpec.
 * Every spec has a type field of type FunctionTriggerType that we can use to understand which
 * type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export type FunctionTriggerType = 'subscription' | 'timer' | 'webhook' | 'websocket';

const SubscriptionTriggerSchema = S.struct({
  type: S.literal('subscription'),
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

export type SubscriptionTrigger = S.Schema.Type<typeof SubscriptionTriggerSchema>;

const TimerTriggerSchema = S.struct({
  type: S.literal('timer'),
  cron: S.string,
});

export type TimerTrigger = S.Schema.Type<typeof TimerTriggerSchema>;

const WebhookTriggerSchema = S.mutable(
  S.struct({
    type: S.literal('webhook'),
    method: S.string,
    // Assigned port.
    port: S.optional(S.number),
  }),
);

export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;

const WebsocketTriggerSchema = S.struct({
  type: S.literal('websocket'),
  url: S.string,
  init: S.optional(S.record(S.string, S.any)),
});

export type WebsocketTrigger = S.Schema.Type<typeof WebsocketTriggerSchema>;

const TriggerSpecSchema = S.union(
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
  uri: S.string,
  description: S.optional(S.string),
  route: S.string,
  // TODO(burdon): NPM/GitHub/Docker/CF URL?
  handler: S.string,
}) {}

export class FunctionTrigger extends TypedObject({
  typename: 'dxos.org/type/FunctionTrigger',
  version: '0.1.0',
})({
  function: S.string.pipe(S.description('Function URI.')),
  // Context is merged into the event data passed to the function.
  meta: S.optional(S.object),
  spec: TriggerSpecSchema,
}) {}

/**
 * Function manifest file.
 */
export const FunctionManifestSchema = S.struct({
  functions: S.optional(S.mutable(S.array(RawObject(FunctionDef)))),
  triggers: S.optional(S.mutable(S.array(RawObject(FunctionTrigger)))),
});

export type FunctionManifest = S.Schema.Type<typeof FunctionManifestSchema>;
