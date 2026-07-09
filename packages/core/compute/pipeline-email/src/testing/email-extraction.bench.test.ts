//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { Provider } from '@dxos/ai';
import { OllamaAiServiceLayer } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Pipeline } from '@dxos/pipeline';
import { type DocumentFacts, extractFactsStage } from '@dxos/pipeline-rdf';
import { captureSink, instrument, renderBenchmark, runBenchmark } from '@dxos/pipeline/testing';

import { EMAIL_EXTRACT_OPTIONS, messageToDocument } from '../stages/facts';
import { emailToMessage } from './email-fixtures';
import { parquetSource } from './parquet';

// Compares fact-extraction quality across local models over the head of the Enron dataset. Same
// gating as email-pipeline.test.ts: needs the dataset under ROOT_DIR and a running Ollama, so CI and
// un-provisioned checkouts skip it. This is the first concrete use of the `@dxos/pipeline/testing`
// benchmark framework: an instrumented extraction stage feeds per-stage counters, and an effectful
// evaluator derives the domain metrics (facts per message, extraction success rate).
const DEFAULT_ROOT_DIR = fileURLToPath(new URL('../../data/enron-emails', import.meta.url));
const ROOT_DIR = process.env.ROOT_DIR ?? DEFAULT_ROOT_DIR;
const HAS_DATASET = existsSync(join(ROOT_DIR, 'data'));

// Where the benchmark's serialized comparison is written (git-ignored, under the package's ./data).
const BENCH_FILE = fileURLToPath(new URL('../../data/benchmark.json', import.meta.url));

// Models to compare (Ollama DXNs).
const BENCH_MODELS = [
  'com.meta.model.llama-3-2-3b.instruct',
  'com.alibaba.model.qwen-2-5-7b.instruct',
  'com.google.model.gemma-4-12b.default',
];

// Emails drawn from the head of the dataset per model. Kept modest by default (each is one LLM call
// per model); override via BENCH_COUNT for a heavier comparison.
const BENCH_COUNT = Number(process.env.BENCH_COUNT ?? 10);

describe.skipIf(!HAS_DATASET)('email extraction benchmark (ROOT_DIR + Ollama gated)', () => {
  test(
    'compares fact extraction across models',
    async ({ expect }) => {
      const dataDir = join(ROOT_DIR, 'data');
      const files = (await readdir(dataDir))
        .filter((name) => /^train-.*\.parquet$/.test(name))
        .sort()
        .map((name) => join(dataDir, name));
      expect(files.length).toBeGreaterThan(0);

      const variants = BENCH_MODELS.map((model) => ({ name: modelLabel(model), config: { model } }));

      const result = await EffectEx.runPromise(
        runBenchmark({
          variants,
          // Stream the first BENCH_COUNT emails through the instrumented extraction stage under the
          // variant's model; the fallback in pipeline-rdf degrades a failed extraction to no facts, so
          // a weak model yields low facts-per-message rather than aborting the run.
          program: ({ model }) => {
            const { sink, items } = captureSink<DocumentFacts>();
            return parquetSource(files)
              .pipe(
                Stream.take(BENCH_COUNT),
                Stream.map(emailToMessage),
                Stream.map(messageToDocument),
                instrument(
                  'extract',
                  extractFactsStage({ ...EMAIL_EXTRACT_OPTIONS, model, provider: Provider.ollama.id, strict: false }),
                ),
                Pipeline.run({ sink }),
              )
              .pipe(Effect.provide(OllamaAiServiceLayer), Effect.as(items));
          },
          // Domain metrics computed from the captured per-document facts.
          evaluate: (_config, docs) => {
            const facts = docs.reduce((total, entry) => total + entry.facts.length, 0);
            const withFacts = docs.filter((entry) => entry.facts.length > 0).length;
            return Effect.succeed({
              'messages': docs.length,
              facts,
              'facts.per.msg': docs.length ? round(facts / docs.length) : 0,
              'success.rate': docs.length ? round(withFacts / docs.length) : 0,
            });
          },
        }),
      );

      const table = renderBenchmark(result);
      log.info(`email extraction benchmark (${BENCH_COUNT} emails)\n${table}`);
      await writeFile(BENCH_FILE, JSON.stringify(result, null, 2));

      expect(result.variants.length).toBe(variants.length);
      // Every variant ran the extraction stage over the whole sample (fewer only if the dataset is
      // smaller). A model that produced zero facts still counts as a completed, comparable run.
      for (const variant of result.variants) {
        expect(variant.metrics['extract.in']).toBeGreaterThan(0);
        expect(variant.metrics.messages).toBe(variant.metrics['extract.out']);
      }
    },
    // Two LLM calls at most per message per model; budget generously so larger BENCH_COUNT runs and
    // slower models don't trip the per-test timeout.
    Math.max(5 * 60_000, BENCH_MODELS.length * BENCH_COUNT * 45_000),
  );
});

// Short display label from a model DXN, e.g. `com.openai.model.gpt-oss-20b.default` -> `gpt-oss-20b`.
const modelLabel = (model: string): string => model.split('.').at(-2) ?? model;

const round = (value: number): number => Math.round(value * 100) / 100;
