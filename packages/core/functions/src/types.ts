//
// Copyright 2023 DXOS.org
//

import { S, AST, TypedObject } from '@dxos/echo-schema';

/**
 * Type discriminator for TriggerSpec.
 * Every spec has a type field of type FunctionTriggerType that we can use to understand which
 * type we're working with.
 * https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
 */
export enum FunctionTriggerType {
  TIMER = 'timer',
  WEBHOOK = 'webhook',
  WEBSOCKET = 'websocket',
  ECHO = 'echo',
}

const TimerTriggerSchema = S.struct({
  type: S.literal(FunctionTriggerType.TIMER),
  cron: S.string,
});
export type TimerTrigger = S.Schema.Type<typeof TimerTriggerSchema>;

const WebhookTriggerSchema = S.mutable(
  S.struct({
    type: S.literal(FunctionTriggerType.WEBHOOK),
    method: S.string,
    // Assigned port.
    port: S.optional(S.number),
  }),
);
export type WebhookTrigger = S.Schema.Type<typeof WebhookTriggerSchema>;

const WebsocketTriggerSchema = S.struct({
  type: S.literal(FunctionTriggerType.WEBSOCKET),
  url: S.string,
  init: S.optional(S.record(S.string, S.any)),
});
export type WebsocketTrigger = S.Schema.Type<typeof WebsocketTriggerSchema>;

const SubscriptionTriggerSchema = S.struct({
  type: S.literal(FunctionTriggerType.ECHO),
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
export type SubscriptionTrigger = S.Schema.Type<typeof SubscriptionTriggerSchema>;

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
  typename: 'dxos.functions.FunctionDef',
  version: '0.1.0',
})({
  functionId: S.string,
  description: S.optional(S.string),
  route: S.string,
  // TODO(burdon): NPM/GitHub/Docker/CF URL?
  handler: S.string,
}) {}

export class FunctionTrigger extends TypedObject({ typename: 'dxos.functions.FunctionTrigger', version: '0.1.0' })({
  function: S.string.pipe(S.description('Function ID/URI.')),
  // Context passed to a function.
  meta: S.optional(S.record(S.string, S.any)),
  spec: TriggerSpecSchema,
}) {}

const omitEchoId = <T>(schema: S.Schema<T>): S.Schema<Omit<T, 'id'>> => S.make(AST.omit(schema.ast, ['id']));
/**
 * Function manifest file.
 */
export const FunctionManifestSchema = S.struct({
  functions: S.optional(S.mutable(S.array(omitEchoId(FunctionDef)))),
  triggers: S.optional(S.mutable(S.array(omitEchoId(FunctionTrigger)))),
});

export type FunctionManifest = S.Schema.Type<typeof FunctionManifestSchema>;
