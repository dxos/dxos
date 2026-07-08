//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Provider } from '@dxos/ai';
import { OllamaAiServiceLayer } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Pipeline } from '@dxos/pipeline';
import { Metrics, captureSink, instrument, makeMetrics } from '@dxos/pipeline/testing';

import { type DocumentFacts, extractFactsStage } from '../stages';
import { type ExtractDocument } from '../types';

// Minimal control for the extraction pipeline: run ONE model over a handful of trivial one-sentence
// documents — no email parsing, no chunking, no model swaps — to isolate LLM/adapter behaviour and
// latency from any downstream confounders. Extraction is left at its default (strict generateObject,
// then lenient generateText fallback) on purpose, so the per-chunk logs reveal whether the model's
// output actually decodes into facts. Opt-in (needs a running Ollama), so CI and bare checkouts skip:
//   SANITY_OLLAMA=1 moon run pipeline-rdf:test -- src/extraction-sanity.test.ts
const ENABLED = !!process.env.SANITY_OLLAMA;

// Single model to sanity-check. Override via SANITY_MODEL; defaults to the smallest/fastest.
const MODEL = process.env.SANITY_MODEL ?? 'com.meta.model.llama-3-2-3b.instruct';

// Each is a single short proposition => one chunk, one extraction, one obvious fact.
const DOCS: readonly ExtractDocument[] = [
  { text: 'Alice works at Acme.', source: 'doc-1' },
  { text: 'Bob manages the Orion project.', source: 'doc-2' },
  { text: 'Carol reports to Dave.', source: 'doc-3' },
];

describe.skipIf(!ENABLED)('extraction sanity (Ollama gated)', () => {
  test('one model extracts facts from trivial sentences', async ({ expect }) => {
    const metrics = makeMetrics();
    const { sink, items } = captureSink<DocumentFacts>();

    await EffectEx.runPromise(
      Stream.fromIterable(DOCS)
        .pipe(
          instrument('extract', extractFactsStage({ model: MODEL, provider: Provider.ollama.id, strict: false })),
          Pipeline.run({ sink }),
        )
        .pipe(Effect.provide(Layer.merge(OllamaAiServiceLayer, Layer.succeed(Metrics, metrics)))),
    );

    const timing = await EffectEx.runPromise(metrics.snapshot);
    const facts = items.flatMap((entry) => [...entry.facts]);
    log.info('extraction sanity', {
      model: MODEL,
      docs: DOCS.length,
      facts: facts.length,
      sample: facts.slice(0, 5).map((fact) => fact.assertion),
      timing,
    });

    // The pipeline processed every document with no stage errors.
    expect(items.length).toBe(DOCS.length);
    expect(timing['extract.errors'] ?? 0).toBe(0);
    // A working model + adapter should extract at least one fact from three trivial propositions.
    expect(facts.length).toBeGreaterThan(0);
  }, 120_000);
});
