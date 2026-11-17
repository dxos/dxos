//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type * as SqlClient from 'effect/sql/SqlClient';

import { RdfStore } from '@dxos/echo-memory';
import { type FeedStore } from '@dxos/feed';
import { EntityId, type SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import type { QuadStore } from '@dxos/sparql-sqlite/async';

/** Seed of the id of a space's fact feed, which every device derives the same way so the feed replicates as one. */
const FACT_FEED_SEED = 'org.dxos.memory.facts';

/** The id of a space's feed in the `facts` namespace. */
export const factFeedId = (spaceId: SpaceId): EntityId => EntityId.deterministic(FACT_FEED_SEED, spaceId);

/** The feed namespace a space's RDF store is logged in. */
export const FACTS_NAMESPACE = FeedProtocol.WellKnownNamespaces.facts;

const encodeBatch = Schema.encodeSync(RdfStore.Batch);
const decodeBatch = Schema.decodeUnknownSync(RdfStore.Batch);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** Serializes a batch as a block payload. */
export const batchToBytes = (batch: RdfStore.Batch): Uint8Array =>
  textEncoder.encode(JSON.stringify(encodeBatch(batch)));

/** Inverse of {@link batchToBytes}. */
export const batchFromBytes = (data: Uint8Array): RdfStore.Batch => decodeBatch(JSON.parse(textDecoder.decode(data)));

/** Most blocks one read pulls from the feed per query. */
const PAGE_SIZE = 500;

export type FactFeedOptions = {
  readonly feeds: FeedStore;
  readonly spaceId: SpaceId;
  /** The space's fact feed. */
  readonly feedId: string;
};

/**
 * A quad log over a feed in the `facts` namespace of the space's feed store, which replicates it like any other feed:
 * the store appends each batch there before applying it, and rebuilds from it when empty. The cursor is the feed's own
 * query cursor.
 */
export const factFeedLog = ({
  feeds,
  spaceId,
  feedId,
}: FactFeedOptions): Effect.Effect<QuadStore.QuadLog, never, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const services = yield* Effect.context<SqlClient.SqlClient>();
    return {
      append: (batch) =>
        feeds
          .appendLocal([{ spaceId, feedId, feedNamespace: FACTS_NAMESPACE, data: batchToBytes(batch) }])
          .pipe(Effect.asVoid, Effect.provide(services)),

      read: (cursor) =>
        Effect.gen(function* () {
          const batches: RdfStore.Batch[] = [];
          let next = cursor === undefined ? undefined : FeedProtocol.FeedCursor.make(cursor);
          while (true) {
            const page = yield* feeds.query({
              spaceId,
              feedNamespace: FACTS_NAMESPACE,
              query: { feedIds: [feedId] },
              cursor: next,
              limit: PAGE_SIZE,
            });
            batches.push(...page.blocks.map(({ data }) => batchFromBytes(data)));
            next = page.nextCursor;
            if (!page.hasMore) {
              return { batches, next };
            }
          }
        }).pipe(Effect.provide(services)),

      listen: (onChange) =>
        Effect.acquireRelease(
          Effect.sync(() =>
            feeds.onNewBlocks.on((event) => {
              if (event.spaceId === spaceId && (event.feedNamespace ?? FACTS_NAMESPACE) === FACTS_NAMESPACE) {
                onChange();
              }
            }),
          ),
          (unsubscribe) => Effect.sync(() => unsubscribe()),
        ),
    } satisfies QuadStore.QuadLog;
  });
