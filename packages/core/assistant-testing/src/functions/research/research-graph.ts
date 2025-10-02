//
// Copyright 2025 DXOS.org
//

import { Effect, Layer, Schema } from 'effect';

import { Obj, Query, Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { ContextQueueService, DatabaseService, QueueService } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

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

export const ResearchOn = Schema.Struct({
  id: Type.ObjectId,
  completedAt: Type.Format.DateTime,
}).pipe(
  Type.Relation({
    typename: 'dxos.org/relation/ResearchOn',
    version: '0.1.0',
    source: Markdown.Document,
    target: Type.Expando, // TODO(burdon): Type.Obj.Any.
  }),
);
