//
// Copyright 2025 DXOS.org
//

import { Effect, Schema, Layer } from 'effect';

import { Obj, Query, Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { DatabaseService, QueueService, ContextQueueService } from '@dxos/functions';

/**
 * Container for a set of ephemeral research results.
 */
export const ResearchGraph = Schema.Struct({
  queue: Type.Ref(Queue),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ResearchGraph',
    version: '0.1.0',
  }),
);
export interface ResearchGraph extends Schema.Schema.Type<typeof ResearchGraph> {}

export const queryResearchGraph: () => Effect.Effect<ResearchGraph | undefined, never, DatabaseService> = Effect.fn(
  'queryResearchGraph',
)(function* () {
  const { objects } = yield* DatabaseService.runQuery(Query.type(ResearchGraph));
  return objects.at(0);
});

export const createResearchGraph: () => Effect.Effect<ResearchGraph, never, DatabaseService | QueueService> = Effect.fn(
  'createResearchGraph',
)(function* () {
  const queue = yield* QueueService.createQueue();
  return yield* DatabaseService.add(Obj.make(ResearchGraph, { queue: Ref.fromDXN(queue.dxn) }));
});

export const contextQueueLayerFromResearchGraph = Layer.unwrapEffect(
  Effect.gen(function* () {
    const researchGraph = (yield* queryResearchGraph()) ?? (yield* createResearchGraph());
    const researchQueue = yield* DatabaseService.load(researchGraph.queue);
    return ContextQueueService.layer(researchQueue);
  }),
);
