//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

/**
 * Where a binding sits in the scope the dialect built, as a path rather than a name, so a nested
 * group like `ops` survives the crossing without flattening its keys into an ambiguous string.
 */
export const BindingPath = Schema.Array(Schema.String);

/**
 * A binding call the worker wants the host to make.
 *
 * `args` and the reply travel by structured clone, so they carry plain data only — the host
 * substitutes a snapshot for every live object on the way out and resolves it back on the way in.
 */
export const Call = Schema.Struct({
  _tag: Schema.Literal('Call'),
  /** Correlates the reply; unique for the life of one evaluation. */
  id: Schema.Number,
  path: BindingPath,
  args: Schema.Array(Schema.Any),
});

/** The evaluation finished and produced this value. */
export const Done = Schema.Struct({
  _tag: Schema.Literal('Done'),
  value: Schema.Any,
});

/** The model's code threw, or asked for something the boundary cannot carry. */
export const Failed = Schema.Struct({
  _tag: Schema.Literal('Failed'),
  message: Schema.String,
});

/** Everything the worker emits over the life of one `evaluate`. */
export const Outbound = Schema.Union([Call, Done, Failed]);
export type Outbound = typeof Outbound.Type;

/** What the host answers a {@link Call} with. */
export const Outcome = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('Ok'), value: Schema.Any }),
  Schema.Struct({ _tag: Schema.Literal('Error'), message: Schema.String }),
]);
export type Outcome = typeof Outcome.Type;

/**
 * The contract between the host and the worker it spawned, served BY the worker.
 *
 * The direction is forced by the transport: `effect/unstable/rpc` speaks host-client to
 * worker-server over a worker's own message channel, while the calls that matter run the other way
 * — the database lives on the host and only the model's code lives in the worker. So `evaluate`
 * streams the worker's requests out as its result, and the host answers each one with `resolve`,
 * which is a plain host-to-worker call. One channel, both directions, no second port.
 */
export const SandboxProtocol = RpcGroup.make(
  Rpc.make('evaluate', {
    payload: Schema.Struct({
      /** The body of an async function, as the dialect wrapped it. */
      code: Schema.String,
      /** Every binding the worker should put in that function's scope, as a stub calling home. */
      bindings: Schema.Array(BindingPath),
    }),
    success: Outbound,
    stream: true,
  }),
  Rpc.make('resolve', {
    payload: Schema.Struct({ id: Schema.Number, outcome: Outcome }),
    success: Schema.Void,
  }),
);
