//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Database, Feed, Migration, Obj, Query, Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { ContextQueueService, QueueService } from '@dxos/functions';

/** @deprecated Use ResearchGraph instead. */
export const LegacyResearchGraph = Schema.Struct({
  queue: Ref.Ref(Queue),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.research-graph',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface LegacyResearchGraph extends Schema.Schema.Type<typeof LegacyResearchGraph> {}

/** @deprecated Migration target of LegacyResearchGraph; migrated to ResearchGraph (v0.2.0) with feed ref. */
export const ResearchGraphV1 = Schema.Struct({
  queue: Ref.Ref(Queue),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.researchGraph',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface ResearchGraphV1 extends Schema.Schema.Type<typeof ResearchGraphV1> {}

/**
 * Container for a set of ephemeral research results.
 */
export const ResearchGraph = Schema.Struct({
  queue: Ref.Ref(Feed.Feed),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.researchGraph',
    version: '0.2.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface ResearchGraph extends Schema.Schema.Type<typeof ResearchGraph> {}

export const create: () => Effect.Effect<ResearchGraph, never, Database.Service | QueueService> = Effect.fn(
  'createResearchGraph',
)(function* () {
  const feed = yield* Database.add(Feed.make());
  return yield* Database.add(Obj.make(ResearchGraph, { queue: Ref.make(feed) }));
});

export const query: () => Effect.Effect<ResearchGraph | undefined, never, Database.Service> = Effect.fn(
  'queryResearchGraph',
)(function* () {
  const objects = yield* Database.runQuery(Query.type(ResearchGraph));
  return objects.at(0);
});

export const contextQueueLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const researchGraph = (yield* query()) ?? (yield* create());
    const researchFeed = yield* Database.load(researchGraph.queue);
    const feedDxn = Feed.getQueueDxn(researchFeed);
    if (!feedDxn) {
      throw new Error('ResearchGraph feed must be stored in a space');
    }
    const { queues } = yield* QueueService;
    return ContextQueueService.layer(queues.get(feedDxn));
  }),
);

export const migrations = [
  Migration.define({
    from: ResearchGraphV1,
    to: ResearchGraph,
    transform: async (from, { db }) => {
      const feed = Feed.unsafeFromQueueDXN(from.queue.dxn);
      const existing = db.getObjectById<Feed.Feed>(feed.id);
      const dbFeed = existing ?? db.add(feed);
      return {
        queue: Ref.make(dbFeed),
      };
    },
    onMigration: async () => {},
  }),
];
