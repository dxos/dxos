//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Provider } from '@dxos/ai';
import { OllamaAiServiceLayer } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Pipeline } from '@dxos/pipeline';
import { captureSink, instrument, renderBenchmark, runBenchmark } from '@dxos/pipeline/testing';

import { type ExtractDocument } from '../internal/stages/extract';
import { type DocumentFacts, extractFactsStage } from '../stages';

// Compares pipeline-rdf fact extraction across local models over a fixed sample corpus (no email
// parsing / no dataset — unlike pipeline-email's email-extraction.bench). Opt-in (needs a running
// Ollama with the models pulled), so CI and bare checkouts skip:
//   RDF_BENCH=1 moon run pipeline-rdf:test -- src/testing/multi-model.bench.test.ts
// Instrument feeds per-stage counters (extract.in/out/errors); the evaluator derives domain metrics
// (facts per doc, extraction success rate, predicate/entity diversity) from the captured facts.
const ENABLED = !!process.env.RDF_BENCH;

// Models to compare (Ollama DXNs). Override the set via BENCH_MODELS (comma-separated DXNs).
const BENCH_MODELS = (
  process.env.BENCH_MODELS ??
  [
    'com.meta.model.llama-3-2-3b.instruct',
    'com.alibaba.model.qwen-2-5-7b.instruct',
    'com.google.model.gemma-4-12b.default',
  ].join(',')
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

// A fixed, varied corpus: each sentence carries one or two obvious propositions spanning distinct
// predicate shapes (membership, employment, temporal, dependency, location) so the comparison
// exercises more than a single relation type.
const DOCS: readonly ExtractDocument[] = [
  { text: 'Alice works at Acme.', source: 'doc-1' },
  { text: 'Bob manages the Orion project.', source: 'doc-2' },
  { text: 'Carol reports to Dave.', source: 'doc-3' },
  { text: 'Socrates is a Greek philosopher.', source: 'doc-4' },
  { text: 'Plato was a student of Socrates.', source: 'doc-5' },
  { text: 'Acme acquired Initech in 2021.', source: 'doc-6' },
  { text: 'Dave lives in Berlin.', source: 'doc-7' },
  { text: 'The Orion project depends on the Titan library.', source: 'doc-8' },
  { text: 'Eve founded Globex.', source: 'doc-9' },
  { text: 'The Q3 board meeting is scheduled for 2026-07-15.', source: 'doc-10' },
];

describe.skipIf(!ENABLED)('pipeline-rdf multi-model extraction benchmark (Ollama gated)', () => {
  test(
    'compares fact extraction across models',
    async ({ expect }) => {
      const variants = BENCH_MODELS.map((model) => ({ name: modelLabel(model), config: { model } }));

      const result = await EffectEx.runPromise(
        runBenchmark({
          variants,
          // Stream the corpus through the instrumented extraction stage under the variant's model.
          // pipeline-rdf degrades a failed extraction to no facts, so a weak model yields a low
          // facts-per-doc rather than aborting the run. `strict: false` skips the generateObject
          // attempt local models reliably fail, making each doc a single generation.
          program: ({ model }) => {
            const { sink, items } = captureSink<DocumentFacts>();
            return Stream.fromIterable(DOCS)
              .pipe(
                instrument('extract', extractFactsStage({ model, provider: Provider.ollama.id, strict: false })),
                Pipeline.run({ sink }),
              )
              .pipe(Effect.provide(OllamaAiServiceLayer), Effect.as(items));
          },
          // Domain metrics from the captured per-document facts.
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
            return Effect.succeed({
              'docs': docs.length,
              'facts': allFacts.length,
              'facts.per.doc': docs.length ? round(allFacts.length / docs.length) : 0,
              'success.rate': docs.length ? round(withFacts / docs.length) : 0,
              'distinct.predicates': predicates.size,
              'distinct.entities': entities.size,
            });
          },
        }),
      );

      const table = renderBenchmark(result);
      log.info(`pipeline-rdf multi-model benchmark (${DOCS.length} docs)\n${table}`);

      expect(result.variants.length).toBe(variants.length);
      // A variant may error mid-run (recorded as an `error` row with a partial `extract.in`) — that
      // is a benchmark result about the model, not a test failure. Require only that at least one
      // model completed, and that every model which did NOT error processed the whole corpus (a
      // model producing zero facts still counts as a completed, comparable run).
      const succeeded = result.variants.filter((variant) => variant.metrics.error === undefined);
      expect(succeeded.length).toBeGreaterThan(0);
      for (const variant of succeeded) {
        expect(variant.metrics['extract.in']).toBe(DOCS.length);
        expect(variant.metrics['extract.out']).toBe(DOCS.length);
      }
    },
    // Up to two LLM calls per doc per model; budget generously for slower/larger models.
    Math.max(5 * 60_000, BENCH_MODELS.length * DOCS.length * 30_000),
  );
});

// Short display label from a model DXN, e.g. `com.openai.model.gpt-oss-20b.default` -> `gpt-oss-20b`.
const modelLabel = (model: string): string => model.split('.').at(-2) ?? model;

const round = (value: number): number => Math.round(value * 100) / 100;
