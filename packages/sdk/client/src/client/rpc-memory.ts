//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type ClientServicesRpc } from '@dxos/client-protocol';
import * as MemoryError from '@dxos/echo-memory/MemoryError';
import * as MemoryQuery from '@dxos/echo-memory/MemoryQuery';
import type * as MemoryService from '@dxos/echo-memory/MemoryService';
import { type SpaceId } from '@dxos/keys';

/**
 * A space's {@link MemoryService.Service} served by the client services host, which runs the memory beside the
 * space's store, so every page and operation shares one rule evaluator per space. `getRpc` is read per call because a reconnect to a new worker replaces the RPC
 * proxy.
 */
export const createRpcMemory = (getRpc: () => ClientServicesRpc, spaceId: SpaceId): MemoryService.Service => {
  const call = <A>(message: string, effect: Effect.Effect<A, unknown>): Effect.Effect<A, MemoryError.MemoryError> =>
    effect.pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message, ifTypeDiffers: true })));

  return {
    put: (facts, options) =>
      call(
        'Failed to put facts',
        Effect.suspend(() => getRpc()['MemoryService.put']({ spaceId, facts, options })).pipe(
          Effect.map(({ queued }) => queued),
        ),
      ),
    query: (query) =>
      call(
        `Failed to answer a ${query._tag} query`,
        Effect.suspend(() => getRpc()['MemoryService.query']({ spaceId, query })).pipe(
          Effect.flatMap(({ result }) => Schema.decodeUnknownEffect(MemoryQuery.resultOf(query))(result)),
        ),
      ),
    reset: () =>
      call(
        'Failed to reset memory',
        Effect.suspend(() => getRpc()['MemoryService.reset']({ spaceId })),
      ),
    subscribe: (subscription) =>
      call(
        'Failed to subscribe',
        Effect.suspend(() => getRpc()['MemoryService.subscribe']({ spaceId, subscription })).pipe(
          Effect.map(({ added }) => added),
        ),
      ),
    subscriptions: (owner) =>
      call(
        'Failed to list subscriptions',
        Effect.suspend(() => getRpc()['MemoryService.subscriptions']({ spaceId, owner })).pipe(
          Effect.map(({ subscriptions }) => [...subscriptions]),
        ),
      ),
    unsubscribe: (id) =>
      call(
        'Failed to unsubscribe',
        Effect.suspend(() => getRpc()['MemoryService.unsubscribe']({ spaceId, id })).pipe(
          Effect.map(({ removed }) => removed),
        ),
      ),
    take: (id) =>
      call(
        'Failed to read the outbox',
        Effect.suspend(() => getRpc()['MemoryService.take']({ spaceId, id })).pipe(
          Effect.map(({ events }) => [...events]),
        ),
      ),
    ack: (id, events) =>
      call(
        'Failed to acknowledge events',
        Effect.suspend(() => getRpc()['MemoryService.ack']({ spaceId, id, events })),
      ),
  };
};
