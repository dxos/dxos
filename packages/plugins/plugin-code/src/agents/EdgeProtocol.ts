//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

//
// The wire shapes of EDGE's coding-agent process (compute-service `processes/coding-agent/protocol.ts`
// in dxos/edge). Declared here because EDGE consumes this repository, not the other way round; the
// RPC group must match the host's name for name and field for field, since effect-rpc encodes by it.
//

export const PROCESS_KEY = 'org.dxos.edge.process.coding-agent';

/** Spawn annotations the process reads. */
export const Annotation = {
  mode: 'org.dxos.coding-agent.mode',
  unattended: 'org.dxos.coding-agent.unattended',
} as const;

export type Input = { _tag: 'prompt'; turnId: string; text: string } | { _tag: 'cancel' };

export const Output = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('update'), turnId: Schema.String, update: Schema.Unknown }),
  Schema.Struct({
    _tag: Schema.Literal('permission'),
    turnId: Schema.String,
    requestId: Schema.String,
    request: Schema.Unknown,
    resolution: Schema.optional(Schema.Struct({ optionId: Schema.NullOr(Schema.String) })),
  }),
  Schema.Struct({
    _tag: Schema.Literal('turn-end'),
    turnId: Schema.String,
    stopReason: Schema.String,
    usage: Schema.optional(Schema.Unknown),
    error: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal('status'),
    status: Schema.Literals(['starting', 'ready', 'restarting', 'failed']),
    detail: Schema.optional(Schema.String),
  }),
  Schema.Struct({ _tag: Schema.Literal('auth-required') }),
]);
export type Output = Schema.Schema.Type<typeof Output>;

export const AnthropicCredential = Schema.Struct({
  kind: Schema.Literals(['api-key', 'oauth']),
  value: Schema.String,
  expiresAt: Schema.optional(Schema.Number),
});
export type AnthropicCredential = Schema.Schema.Type<typeof AnthropicCredential>;

export const Control = RpcGroup.make(
  Rpc.make('provideAuth', { payload: AnthropicCredential, success: Schema.Void }),
  Rpc.make('respondPermission', {
    payload: Schema.Struct({ requestId: Schema.String, optionId: Schema.NullOr(Schema.String) }),
    success: Schema.Struct({ answered: Schema.Boolean }),
  }),
  Rpc.make('getState', {
    success: Schema.Struct({
      status: Schema.Literals(['starting', 'ready', 'restarting', 'failed']),
      sessionId: Schema.NullOr(Schema.String),
      turnId: Schema.NullOr(Schema.String),
      restarts: Schema.Number,
      hasCredential: Schema.Boolean,
    }),
  }),
);

export type ControlRpcs = RpcGroup.Rpcs<typeof Control>;
