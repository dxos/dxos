//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CrawlState } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { Database } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { MemoryQuery, MemoryService } from '@dxos/echo-memory';
import * as MemorySqlite from '@dxos/echo-memory-sqlite/MemorySqlite';
import { indexFactsBatch } from '@dxos/pipeline-rdf';

import { spaceMemoryFactStoreLayer } from './space-memory-fact-store.ts';

const TestLayer = Layer.merge(TestDatabaseLayer({ types: [CrawlState.CrawlState] }), MemorySqlite.layerMemory);

const DOCS = [
  { text: 'Alice owns the Composer storage layer.', source: 'discord:1', author: 'discord-user:alice' },
  { text: 'Bob reviews the OPFS migration on Friday.', source: 'discord:2', author: 'discord-user:bob' },
];

const memoryFacts = MemoryService.MemoryService.use((memory) => memory.query(MemoryQuery.facts()));

describe('spaceMemoryFactStoreLayer', () => {
  it.effect("puts facts into the space's memory and skips documents whose hash it already holds", () =>
    Effect.gen(function* () {
      const state = yield* Database.add(CrawlState.make());
      const prompts: string[] = [];
      const index = indexFactsBatch(DOCS).pipe(
        Effect.provide(Layer.merge(spaceMemoryFactStoreLayer({ state }), deterministicAiService(prompts))),
      );

      const first = yield* index;
      expect(prompts).toHaveLength(1);
      expect(first.map(({ doc }) => doc.source)).toEqual(['discord:1', 'discord:2']);
      const facts = yield* memoryFacts;
      expect(facts.length).toBe(first.flatMap(({ facts }) => facts).length);
      expect(facts.length).toBeGreaterThan(0);
      expect(new Set(facts.map(({ attribution }) => attribution.source))).toEqual(new Set(['discord:1', 'discord:2']));
      expect(Object.keys(state.sourceHashes).sort()).toEqual(['discord:1', 'discord:2']);

      // Unchanged documents reach neither the model nor the memory.
      expect(yield* index).toEqual([]);
      expect(prompts).toHaveLength(1);
      expect((yield* memoryFacts).length).toBe(facts.length);
    }).pipe(Effect.provide(TestLayer)),
  );
});
