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
  repositories: 'org.dxos.coding-agent.repositories',
} as const;

/** A repository the process checks out in its sandbox, under the agent's working directory. */
export const RepositoryCheckout = Schema.Struct({
  /** Directory name under the agent's working directory: one path segment. */
  name: Schema.String,
  /** HTTPS clone URL; a private one is cloned with the `GITHUB_TOKEN` lent through `provideCredentials`. */
  url: Schema.String,
  /** Branch to check out; the remote's default when absent. */
  branch: Schema.optional(Schema.String),
});
export type RepositoryCheckout = Schema.Schema.Type<typeof RepositoryCheckout>;

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
]);
export type Output = Schema.Schema.Type<typeof Output>;

/**
 * The environment the agent runs with, as variable name to value: its Claude credential
 * (`CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`) and any service tokens (`GITHUB_TOKEN`). Each call
 * replaces what the process holds.
 */
export const Credentials = Schema.Struct({ env: Schema.Record(Schema.String, Schema.String) });
export type Credentials = Schema.Schema.Type<typeof Credentials>;

/** EDGE refused the lent map (a malformed or reserved name, or an unprintable value); names the variables, never their values. */
export class InvalidCredentials extends Schema.TaggedError<InvalidCredentials>('InvalidCredentials')(
  'InvalidCredentials',
  {
    message: Schema.String,
  },
) {}

export const Control = RpcGroup.make(
  Rpc.make('provideCredentials', { payload: Credentials, success: Schema.Void, error: InvalidCredentials }),
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
      /** The names of the variables held, never their values. */
      credentials: Schema.Array(Schema.String),
    }),
  }),
);

export type ControlRpcs = RpcGroup.Rpcs<typeof Control>;
