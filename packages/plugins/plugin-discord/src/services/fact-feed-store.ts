//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CrawlState } from '@dxos/crawler';
import { Database, Feed, Obj } from '@dxos/echo';
import { FactStore, type FactStoreApi, SemanticIndexError } from '@dxos/pipeline-rdf';
import * as FactFeed from '@dxos/plugin-agent/FactFeed';

const unsupported = (method: string) =>
  Effect.fail(
    new SemanticIndexError({
      message: `The fact feed store does not support ${method}: register the feed with an agent's brain to query it.`,
    }),
  );

/**
 * A write-only {@link FactStore} over a fact feed: each fact the extractor stores is appended to `feed` as a
 * `FactFeed.FactItem`, and the per-source content hashes that make re-ingest idempotent live in the crawl's
 * {@link CrawlState.CrawlState}, so a message read again unchanged is never sent to the model again.
 *
 * Indexing is the consumer's job (an agent's brain registers the feed), so `query`, `select` and `clear` fail, and
 * `predicates` answers none: the extractor falls back to its seed vocabulary rather than reusing predicates minted by
 * earlier runs.
 */
export const factFeedStoreLayer = ({
  feed,
  state,
}: {
  feed: Feed.Feed;
  state: CrawlState.CrawlState;
}): Layer.Layer<FactStore, never, Database.Service> =>
  Layer.effect(
    FactStore,
    Effect.gen(function* () {
      const database = yield* Database.Service;
      const store: FactStoreApi = {
        putFacts: (facts) =>
          facts.length === 0
            ? Effect.void
            : Feed.append(feed, facts.map(FactFeed.makeItem)).pipe(Effect.provideService(Database.Service, database)),
        predicates: () => Effect.succeed([]),
        query: () => unsupported('query'),
        select: () => unsupported('select'),
        cursor: (source) => Effect.sync(() => CrawlState.sourceHash(state, source)),
        setCursor: (source, hash) =>
          Effect.sync(() => {
            Obj.update(state, (state) => CrawlState.setSourceHash(state, source, hash));
          }),
        clear: () => unsupported('clear'),
      };
      return store;
    }),
  );
