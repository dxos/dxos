//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CrawlState } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { Database, Feed, Filter } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { FactStore, indexFactsBatch } from '@dxos/pipeline-rdf';
import * as FactFeed from '@dxos/plugin-agent/FactFeed';

import { factFeedStoreLayer } from './fact-feed-store.ts';

const TestLayer = TestDatabaseLayer({ types: [CrawlState.CrawlState, FactFeed.FactItem] });

const DOCS = [
  { text: 'Alice owns the Composer storage layer.', source: 'discord:1', author: 'discord-user:alice' },
  { text: 'Bob reviews the OPFS migration on Friday.', source: 'discord:2', author: 'discord-user:bob' },
];

describe('factFeedStoreLayer', () => {
  it.effect('appends facts to the feed and skips documents whose hash it already holds', () =>
    Effect.gen(function* () {
      const state = yield* Database.add(CrawlState.make());
      const feed = yield* Database.add(Feed.make({ name: 'facts' }));
      const prompts: string[] = [];
      const store = factFeedStoreLayer({ feed, state });
      const index = indexFactsBatch(DOCS).pipe(Effect.provide(Layer.merge(store, deterministicAiService(prompts))));

      const first = yield* index;
      expect(prompts).toHaveLength(1);
      expect(first.map(({ doc }) => doc.source)).toEqual(['discord:1', 'discord:2']);
      const items = yield* Feed.query(feed, Filter.type(FactFeed.FactItem)).run;
      expect(items.length).toBe(first.flatMap(({ facts }) => facts).length);
      expect(items.length).toBeGreaterThan(0);
      expect(new Set(items.map(({ fact }) => fact.attribution.source))).toEqual(new Set(['discord:1', 'discord:2']));
      expect(Object.keys(state.sourceHashes).sort()).toEqual(['discord:1', 'discord:2']);

      // Unchanged documents reach neither the model nor the feed.
      expect(yield* index).toEqual([]);
      expect(prompts).toHaveLength(1);
      expect((yield* Feed.query(feed, Filter.type(FactFeed.FactItem)).run).length).toBe(items.length);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('refuses queries: the feed is indexed by its consumer', () =>
    Effect.gen(function* () {
      const state = yield* Database.add(CrawlState.make());
      const feed = yield* Database.add(Feed.make({ name: 'facts' }));
      const error = yield* FactStore.use((store) => store.query({})).pipe(
        Effect.provide(factFeedStoreLayer({ feed, state })),
        Effect.flip,
      );
      expect(error.message).toMatch(/register the feed/);
    }).pipe(Effect.provide(TestLayer)),
  );
});
