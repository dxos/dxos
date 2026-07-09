//
// Copyright 2026 DXOS.org
//

import type * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import type * as RpcGroup from '@effect/rpc/RpcGroup';
import * as RpcTest from '@effect/rpc/RpcTest';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

// Bridges an effect-rpc Handlers implementation to a Client without a wire hop or serialization
// (backed by RpcServer/RpcClient in no-serialization mode). Consumers use the same effect-rpc
// client surface whether the handlers run in-process (edge/local providers) or across a transport.
// Kept protobufjs-free so edge/workerd consumers can bridge without pulling the proto runtime.

/**
 * Builds an in-process effect-rpc client backed directly by the given
 * {@link RpcGroup.HandlersFrom | handlers}, skipping encode/decode. The client is scoped; closing
 * the scope tears down the underlying in-memory server and client.
 */
export const makeInProcessClient = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  handlers: RpcGroup.HandlersFrom<Rpcs>,
): Effect.Effect<RpcClient.RpcClient<Rpcs>, never, Scope.Scope> =>
  // The service rpc groups define no middleware, so the middleware requirement in the inferred type
  // is vacuous; narrow the requirement to Scope so consumers can run the client with only a scope.
  RpcTest.makeClient(group).pipe(Effect.provide(group.toLayer(handlers))) as Effect.Effect<
    RpcClient.RpcClient<Rpcs>,
    never,
    Scope.Scope
  >;
