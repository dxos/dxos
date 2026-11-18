//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as MemoryError from '@dxos/echo-memory/MemoryError';
import * as MemoryQuery from '@dxos/echo-memory/MemoryQuery';
import { MemoryService } from '@dxos/protocols/rpc';

import { SpaceMemories } from './space-memories.ts';

/**
 * Serves `MemoryService` RPCs from each space's memory, which runs here in the host beside its store: one rule
 * evaluator, outbox set and clock per space, however many pages and operations call it.
 */
export const MemoryHostLayer: Layer.Layer<MemoryService.Tag, never, SpaceMemories> = Layer.effect(
  MemoryService.Tag,
  Effect.gen(function* () {
    const spaces = yield* SpaceMemories;
    const memoryFor = spaces.memory;

    const encodeResult = (query: MemoryQuery.Any) => Schema.encodeUnknownEffect(MemoryQuery.resultOf(query));

    const handlers: MemoryService.Handlers = {
      'MemoryService.put': ({ spaceId, facts, options }) =>
        memoryFor(spaceId).pipe(
          Effect.flatMap((memory) => memory.put(facts, options)),
          Effect.map((queued) => ({ queued })),
        ),
      'MemoryService.query': ({ spaceId, query }) =>
        memoryFor(spaceId).pipe(
          Effect.flatMap((memory) => memory.query(query)),
          Effect.flatMap(encodeResult(query)),
          Effect.map((result) => ({ result })),
          Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to answer the query', ifTypeDiffers: true })),
        ),
      'MemoryService.reset': ({ spaceId }) => memoryFor(spaceId).pipe(Effect.flatMap((memory) => memory.reset())),
      'MemoryService.subscribe': ({ spaceId, subscription }) =>
        memoryFor(spaceId).pipe(
          Effect.flatMap((memory) => memory.subscribe(subscription)),
          Effect.map((added) => ({ added })),
        ),
      'MemoryService.subscriptions': ({ spaceId, owner }) =>
        memoryFor(spaceId).pipe(
          Effect.flatMap((memory) => memory.subscriptions(owner)),
          Effect.map((subscriptions) => ({ subscriptions })),
        ),
      'MemoryService.unsubscribe': ({ spaceId, id }) =>
        memoryFor(spaceId).pipe(
          Effect.flatMap((memory) => memory.unsubscribe(id)),
          Effect.map((removed) => ({ removed })),
        ),
      'MemoryService.take': ({ spaceId, id }) =>
        memoryFor(spaceId).pipe(
          Effect.flatMap((memory) => memory.take(id)),
          Effect.map((events) => ({ events })),
        ),
      'MemoryService.ack': ({ spaceId, id, events }) =>
        memoryFor(spaceId).pipe(Effect.flatMap((memory) => memory.ack(id, events))),
    };
    return handlers;
  }),
);
