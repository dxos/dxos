//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Obj, Query, Ref, Type } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';
import { ContextQueueService, QueueService } from '@dxos/functions';

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
  SystemTypeAnnotation.set(true),
);

export interface ResearchGraph extends Schema.Schema.Type<typeof ResearchGraph> {}

export const queryResearchGraph: () => Effect.Effect<ResearchGraph | undefined, never, Database.Service> = Effect.fn(
  'queryResearchGraph',
)(function* () {
  const objects = yield* Database.Service.runQuery(Query.type(ResearchGraph));
  return objects.at(0);
});

export const createResearchGraph: () => Effect.Effect<ResearchGraph, never, Database.Service | QueueService> =
  Effect.fn('createResearchGraph')(function* () {
    const queue = yield* QueueService.createQueue();
    return yield* Database.Service.add(Obj.make(ResearchGraph, { queue: Ref.fromDXN(queue.dxn) }));
  });

export const contextQueueLayerFromResearchGraph = Layer.unwrapEffect(
  Effect.gen(function* () {
    const researchGraph = (yield* queryResearchGraph()) ?? (yield* createResearchGraph());
    const researchQueue = yield* Database.Service.load(researchGraph.queue);
    return ContextQueueService.layer(researchQueue);
  }),
);
