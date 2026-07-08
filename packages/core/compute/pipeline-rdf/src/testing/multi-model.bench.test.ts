//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { Provider } from '@dxos/ai';
import { type AiServicePreset, AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Pipeline } from '@dxos/pipeline';
import { captureSink, instrument, renderBenchmark, runBenchmark } from '@dxos/pipeline/testing';

import { type DocumentFacts, extractFactsStage } from '../stages';
import { EVAL_DOCS, scoreAccuracy } from './multi-model.corpus';

// Compares pipeline-rdf fact extraction across models over the fixed gold corpus (multi-model.corpus),
// scoring accuracy (precision/recall/F1 against the expected facts) alongside raw counts. Three local
// models (via Ollama) are pitched against three edge Claude tiers (haiku < sonnet < opus). Opt-in
// (needs a running Ollama with the models pulled AND edge credentials for the Claude tiers):
//   RDF_BENCH=1 moon run pipeline-rdf:test -- src/testing/multi-model.bench.test.ts
// Env: BENCH_ONLY=llama,haiku (filter variants by name substring); BENCH_LIMIT=10 (first N docs);
//      BENCH_OUT=/path/results.json (results document; defaults to the package root).
const ENABLED = !!process.env.RDF_BENCH;

type Variant = { readonly name: string; readonly model: string; readonly preset: AiServicePreset };

// Local models (Ollama) vs edge Claude tiers of increasing power.
const ALL_VARIANTS: readonly Variant[] = [
  { name: 'llama-3.2-3b', model: 'com.meta.model.llama-3-2-3b.instruct', preset: 'ollama' },
  { name: 'qwen-2.5-7b', model: 'com.alibaba.model.qwen-2-5-7b.instruct', preset: 'ollama' },
  { name: 'gemma-4-12b', model: 'com.google.model.gemma-4-12b.default', preset: 'ollama' },
  { name: 'claude-haiku', model: 'com.anthropic.model.claude-haiku-4-5.default', preset: 'edge-remote' },
  { name: 'claude-sonnet', model: 'com.anthropic.model.claude-sonnet-4-6.default', preset: 'edge-remote' },
  { name: 'claude-opus', model: 'com.anthropic.model.claude-opus-4-8.default', preset: 'edge-remote' },
];

const ONLY = process.env.BENCH_ONLY?.split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const VARIANTS = ONLY?.length
  ? ALL_VARIANTS.filter((variant) => ONLY.some((name) => variant.name.includes(name)))
  : ALL_VARIANTS;

const LIMIT = process.env.BENCH_LIMIT ? Number(process.env.BENCH_LIMIT) : EVAL_DOCS.length;
// Extraction inputs (gold `expected` stripped); scoring re-associates by `doc.source`.
const DOCS = EVAL_DOCS.slice(0, LIMIT).map(({ expected: _expected, ...doc }) => doc);

const OUT_PATH = process.env.BENCH_OUT ?? fileURLToPath(new URL('../../bench-results.json', import.meta.url));

describe.skipIf(!ENABLED)('pipeline-rdf multi-model extraction benchmark (Ollama + edge gated)', () => {
  test(
    'scores fact extraction accuracy across local and edge models',
    async ({ expect }) => {
      const variants = VARIANTS.map((variant) => ({
        name: variant.name,
        config: { model: variant.model, preset: variant.preset },
      }));

      const result = await EffectEx.runPromise(
        runBenchmark({
          variants,
          // Stream the corpus through the instrumented extraction stage under the variant's model and
          // AI backend. pipeline-rdf degrades a failed extraction to no facts, so a weak model yields
          // low accuracy rather than aborting. Local models get `strict: false` (they reliably fail
          // the structured generateObject attempt); edge models keep the strict path.
          program: ({ model, preset }) => {
            const { sink, items } = captureSink<DocumentFacts>();
            const provider = preset === 'ollama' ? Provider.ollama.id : Provider.edge.id;
            return Stream.fromIterable(DOCS)
              .pipe(
                instrument('extract', extractFactsStage({ model, provider, strict: preset !== 'ollama' })),
                Pipeline.run({ sink }),
              )
              .pipe(Effect.provide(AiServiceTestingPreset(preset)), Effect.as(items));
          },
          // Raw counts + accuracy (precision/recall/F1) against the gold facts.
          evaluate: (_config, docs) => {
            const allFacts = docs.flatMap((entry) => [...entry.facts]);
            const withFacts = docs.filter((entry) => entry.facts.length > 0).length;
            const predicates = new Set(allFacts.map((fact) => fact.assertion.predicate));
            const entities = new Set(
              allFacts.flatMap((fact) =>
                [fact.assertion.subject, fact.assertion.object].flatMap((term) =>
                  'entity' in term ? [term.entity] : [],
                ),
              ),
            );
            const accuracy = scoreAccuracy(docs);
            return Effect.succeed({
              'docs': docs.length,
              'facts': allFacts.length,
              'facts.per.doc': docs.length ? round(allFacts.length / docs.length) : 0,
              'success.rate': docs.length ? round(withFacts / docs.length) : 0,
              'distinct.predicates': predicates.size,
              'distinct.entities': entities.size,
              'precision': round(accuracy.precision),
              'recall': round(accuracy.recall),
              'f1': round(accuracy.f1),
              'matched': accuracy.matched,
            });
          },
        }),
      );

      log.info(`pipeline-rdf multi-model benchmark (${DOCS.length} docs)\n${renderBenchmark(result)}`);

      const report = {
        generatedAt: new Date().toISOString(),
        corpusSize: DOCS.length,
        variants: result.variants,
      };
      writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
      log.info(`wrote benchmark results to ${OUT_PATH}`);

      expect(result.variants.length).toBe(variants.length);
      // A variant may error mid-run (recorded as an `error` row) — that is a benchmark result about
      // the model/backend, not a test failure. Require only that at least one variant completed, and
      // that every variant which did NOT error processed the whole corpus.
      const succeeded = result.variants.filter((variant) => variant.metrics.error === undefined);
      expect(succeeded.length).toBeGreaterThan(0);
      for (const variant of succeeded) {
        expect(variant.metrics['extract.in']).toBe(DOCS.length);
        expect(variant.metrics['extract.out']).toBe(DOCS.length);
      }
    },
    // Up to two LLM calls per doc per variant; budget generously for slower/larger models.
    Math.max(10 * 60_000, VARIANTS.length * DOCS.length * 30_000),
  );
});

const round = (value: number): number => Math.round(value * 100) / 100;
