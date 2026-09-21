//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import type * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcGroup from 'effect/unstable/rpc/RpcGroup';
import * as RpcTest from 'effect/unstable/rpc/RpcTest';

// Bridges an effect-rpc Handlers implementation to a Client without a wire hop or serialization
// (backed by RpcServer/RpcClient in no-serialization mode). Consumers use the same effect-rpc
// client surface whether the handlers run in-process (edge/local providers) or across a transport.
// Kept protobufjs-free so edge/workerd consumers can bridge without pulling the proto runtime.

/**
 * A plain object keyed by rpc tag, whose handlers call `handlers` as their receiver.
 *
 * `RpcGroup.toLayer` reads own-enumerable properties and stores the functions it finds, then
 * effect-rpc calls them unbound — so a class-instance implementation both hides its methods (they
 * live on the prototype) and loses `this` when one is found. Either way the failure surfaces at
 * dispatch, where nothing carries it back to the caller, so the request hangs.
 *
 * Each method is resolved per call, so an implementation replaced after the handlers were built
 * (a test spy, a service that swaps a method) is the one that serves the request.
 */
export const normalizeHandlers = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  handlers: RpcGroup.HandlersFrom<Rpcs>,
): RpcGroup.HandlersFrom<Rpcs> => {
  const source = handlers as unknown as Record<string, (...args: any[]) => unknown>;
  const normalized: Record<string, (...args: any[]) => unknown> = {};
  for (const [tag] of group.requests) {
    if (typeof source[tag] === 'function') {
      normalized[tag] = (...args) => source[tag].apply(handlers, args);
    }
  }
  return normalized as unknown as RpcGroup.HandlersFrom<Rpcs>;
};

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
  RpcTest.makeClient(group).pipe(Effect.provide(group.toLayer(normalizeHandlers(group, handlers)))) as Effect.Effect<
    RpcClient.RpcClient<Rpcs>,
    never,
    Scope.Scope
  >;
