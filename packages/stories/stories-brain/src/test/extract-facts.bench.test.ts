//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Feed } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { log } from '@dxos/log';
import { type RDF } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';

import {
  CONCURRENCY,
  FACT_STORE_FIXTURE,
  extractFactsForVariant,
  fixtureExists,
  loadFixtureMessages,
  round,
  saveFacts,
  seedFeed,
  selectVariants,
  toRelative,
  trackProgress,
  writeResults,
} from '../testing/harness';
import { FACT_STORE_MODEL } from './defs';

// Which model's extracted fact set to persist as the Phase-2 fixture (falls back to the largest).
const SAVE_MODEL = FACT_STORE_MODEL;

// Default extraction parallelism per variant: remote models are network-bound (parallelize freely),
// local ollama is GPU-bound (serial avoids thrashing). `CONCURRENCY` overrides both.
const REMOTE_CONCURRENCY = 10;
const concurrencyFor = (preset: string): number => CONCURRENCY ?? (preset === 'ollama' ? 1 : REMOTE_CONCURRENCY);

describe.skipIf(!fixtureExists())('extract facts to fact store (multi-model)', () => {
  test(
    'extracts facts across models, benchmarks them, and saves a fact-store fixture',
    async ({ expect }) => {
      const messages = loadFixtureMessages();
      const variants = selectVariants();
      const rows: Record<string, unknown>[] = [];
      const factsByModel = new Map<string, readonly RDF.Fact[]>();

      for (const variant of variants) {
        const builder = await new EchoTestBuilder().open();
        try {
          const { db } = await builder.createDatabase({ types: [Feed.Feed, Message.Message] });
          const feed = await seedFeed(db, messages);

          const progress = trackProgress(`extract-facts:${variant.name}`, messages.length);
          const start = performance.now();
          // One page over the whole feed: the pipeline's high-water cursor advances only once at the
          // end, so every message is processed regardless of the feed-query order (a per-message
          // pageSize would let the first newer message advance the cursor past the older ones).
          const { processed, facts } = await extractFactsForVariant(
            variant,
            feed,
            db,
            Math.max(1, messages.length),
            () => progress.advance(),
            concurrencyFor(variant.preset),
          );
          progress.done();
          const durationMs = Math.round(performance.now() - start);

          factsByModel.set(variant.name, facts);
          const predicates = new Set(facts.map((fact) => fact.assertion.predicate));
          rows.push({
            model: variant.name,
            messages: messages.length,
            durationMs,
            processed,
            facts: facts.length,
            factsPerMessage: round(facts.length / Math.max(1, processed)),
            distinctPredicates: predicates.size,
          });
          log.info('facts', { model: variant.name, processed, facts: facts.length, durationMs });
        } finally {
          await builder.close();
        }
      }

      // Persist the chosen model's fact set (or the largest) as the Phase-2 fixture.
      const best = [...factsByModel.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      const savedModel = factsByModel.has(SAVE_MODEL) ? SAVE_MODEL : best?.[0];
      const savedFacts = savedModel ? (factsByModel.get(savedModel) ?? []) : [];
      saveFacts(savedFacts, FACT_STORE_FIXTURE);

      writeResults('extract-facts', {
        name: 'extract-facts',
        generatedAt: new Date().toISOString(),
        messages: messages.length,
        corpusSize: messages.length,
        savedModel,
        savedFacts: savedFacts.length,
        factStore: toRelative(FACT_STORE_FIXTURE),
        rows,
      });

      expect(rows.length).toBe(variants.length);
      expect(savedFacts.length).toBeGreaterThanOrEqual(0);
    },
    60 * 60_000,
  );
});
