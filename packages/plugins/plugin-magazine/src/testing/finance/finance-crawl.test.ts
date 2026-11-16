//
// Copyright 2026 DXOS.org
//
// @vitest-environment node

// Runs the finance pipeline (fact extraction with the finance ontology, the ticker mention index, sentiment and event
// classification) over the fetched items (`finance-fetch`) into a persistent SQLite fact store. Reruns resume: items
// already extracted or annotated are skipped by their cursors. Every model call is metered: the run prints its cost
// per stage at catalog list prices and appends its trace to trace.jsonl.
//   [FINANCE_DIR=~/.local/share/dxos/magazine-pipeline/finance] [FINANCE_FACTS_DB=<dir>/facts.db] [FINANCE_DAYS=31]
//   [FINANCE_SAMPLE=n] [FINANCE_THINKING=1] [FINANCE_SENTIMENT=llm|lexicon]  moon run plugin-magazine:finance-crawl
//
// `moon run plugin-magazine:finance-experiment` instead runs several configurations over a sample (FINANCE_SAMPLE,
// default 100), each into a fresh store under <dir>/experiments/, and prints a comparison.
//
// Both need DX_ANTHROPIC_API_KEY and write to persistent locations, so they run only from their moon tasks (which set
// FINANCE_PIPELINE / FINANCE_EXPERIMENT).

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { DirectAiServiceLayer } from '@dxos/ai/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { FactStore, FactStoreLive, RDF } from '@dxos/pipeline-rdf';

import { ItemStore } from './item-store.ts';
import { costReport, meter } from './metering.ts';
import * as FinancePipeline from './pipeline.ts';
import { factMetrics, financeDir, perDay, runLog, sample, sentimentAgreement, withinDays } from './report.ts';
import { ontology } from './vocabulary.ts';

const dir = financeDir();
const days = Number(process.env.FINANCE_DAYS ?? 31);
const hasKey = Boolean(process.env.DX_ANTHROPIC_API_KEY);

const loadItems = (size?: number) => {
  const items = withinDays(new ItemStore(join(dir, 'items.jsonl')).items, days);
  return size ? sample(items, size) : items;
};

/** Runs one configuration into a fact store and reports its facts and cost. */
const runInto = async (
  factsPath: string,
  items: ReturnType<typeof loadItems>,
  options: FinancePipeline.FinancePipelineOptions,
  tracePath: string,
) => {
  mkdirSync(dir, { recursive: true });
  const metering = meter(DirectAiServiceLayer, tracePath);
  const layer = Layer.mergeAll(FactStoreLive.layerFile(factsPath), metering.layer);
  const started = Date.now();
  const { summary, facts } = await EffectEx.runPromise(
    Effect.gen(function* () {
      const summary = yield* FinancePipeline.run(items, options);
      const facts = yield* (yield* FactStore).query({});
      return { summary, facts };
    }).pipe(Effect.provide(layer)),
  );
  return { summary, facts, events: metering.events(), seconds: Math.round((Date.now() - started) / 1000) };
};

const table = (rows: string[][]): string[] => {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map(
    (row) =>
      `  ${row.map((cell, column) => (column === 0 ? cell.padEnd(widths[column]) : cell.padStart(widths[column]))).join('  ')}`,
  );
};

describe('finance crawl', () => {
  test.skipIf(!process.env.FINANCE_PIPELINE || !hasKey)(
    'runs the finance pipeline over the fetched month into the fact store',
    async ({ expect }) => {
      const log = runLog(join(dir, 'run.log'));
      const items = loadItems(process.env.FINANCE_SAMPLE ? Number(process.env.FINANCE_SAMPLE) : undefined);
      const factsPath = process.env.FINANCE_FACTS_DB ?? join(dir, 'facts.db');
      const options: FinancePipeline.FinancePipelineOptions = {
        // Without thinking: on the experiment sample it found more facts (0.97 against 0.71 per item) at half the cost.
        extract: { thinking: process.env.FINANCE_THINKING === '1' },
        annotate: { sentiment: process.env.FINANCE_SENTIMENT === 'lexicon' ? 'lexicon' : 'llm' },
      };
      const range = perDay(items);
      log(
        `\n== crawl ${new Date().toISOString()}: ${items.length} items, ${range.length} days (${range[0]?.[0]} … ${range.at(-1)?.[0]})`,
        `config:  ${FinancePipeline.describe(options)}`,
        `facts:   ${factsPath}`,
      );
      const { summary, facts, events, seconds } = await runInto(factsPath, items, options, join(dir, 'trace.jsonl'));
      const metrics = factMetrics(facts);
      const agreement = sentimentAgreement(items, facts);
      log(
        `run:     ${seconds}s; extracted ${summary.extracted} items (${summary.extractedFacts} facts), annotated ${summary.annotated} (${summary.annotationFacts} facts), ${summary.failedBatches} failed batch(es)`,
        `store:   ${facts.length} facts: ${metrics.extracted} extracted on ${metrics.predicates} predicates (${metrics.onFinance} on finance terms, ${metrics.minted} on ${metrics.mintedPredicates} minted), ${metrics.annotations} annotation`,
        `top:     ${metrics.top.map(([name, count]) => `${name} ${count}`).join(', ')}`,
        `sentiment: ${JSON.stringify(agreement.distribution)}; agrees with lexicon on ${agreement.agree}/${agreement.rated}`,
        ...costReport(events, summary.extracted + summary.annotated),
      );
      expect(facts.length).toBeGreaterThan(0);
    },
    3 * 60 * 60_000,
  );

  test.skipIf(!process.env.FINANCE_EXPERIMENT || !hasKey)(
    'compares pipeline configurations over a sample',
    async ({ expect }) => {
      const log = runLog(join(dir, 'experiments', 'experiments.log'));
      const items = loadItems(Number(process.env.FINANCE_SAMPLE ?? 100));
      const configs: Record<string, FinancePipeline.FinancePipelineOptions> = {
        // Generic packs (schema, foaf, dcterms, org, sioc), no finance terms; deterministic annotation only.
        'generic+lexicon': {
          extract: { ontology: RDF.Vocabularies.DEFAULT },
          annotate: { sentiment: 'lexicon', linkNames: false, events: false },
        },
        // The finance packs, thinking on; every annotation stage on the model.
        'finance+llm': { extract: { ontology: ontology() }, annotate: {} },
        // The finance packs without thinking.
        'finance-nothink': { extract: { ontology: ontology(), thinking: false }, annotate: false },
        // The finance packs, thinking on, in transcripts of 10 headlines rather than 25.
        'finance-batch10': { extract: { ontology: ontology(), batchSize: 10 }, annotate: false },
      };
      const only = process.env.FINANCE_CONFIGS?.split(',');
      log(`\n== experiment ${new Date().toISOString()}: ${items.length} items`);
      const rows: string[][] = [
        ['config', 'extracted', 'facts/item', 'preds', 'finance', 'minted', 'annot', 'USD', 's'],
      ];
      for (const [name, options] of Object.entries(configs)) {
        if (only && !only.includes(name)) {
          continue;
        }
        const factsPath = join(dir, 'experiments', `${name}.db`);
        rmSync(factsPath, { force: true });
        const { summary, facts, events, seconds } = await runInto(
          factsPath,
          items,
          options,
          join(dir, 'experiments', 'trace.jsonl'),
        );
        const metrics = factMetrics(facts, 10);
        const agreement = sentimentAgreement(items, facts);
        const cost = costReport(events, items.length);
        log(
          `\n-- ${name}: ${FinancePipeline.describe(options)}`,
          `facts: ${metrics.extracted} extracted, ${metrics.annotations} annotation; failed batches ${summary.failedBatches}`,
          `top:   ${metrics.top.map(([predicate, count]) => `${predicate} ${count}`).join(', ')}`,
          ...(agreement.rated > 0
            ? [
                `sentiment: ${JSON.stringify(agreement.distribution)}; lexicon agrees on ${agreement.agree}/${agreement.rated}`,
              ]
            : []),
          ...cost,
        );
        const total = /total \$([0-9.]+)/.exec(cost.join('\n'))?.[1] ?? '0';
        rows.push([
          name,
          String(metrics.extracted),
          (metrics.extracted / items.length).toFixed(2),
          String(metrics.predicates),
          `${Math.round((metrics.onFinance / Math.max(1, metrics.extracted)) * 100)}%`,
          `${metrics.minted}/${metrics.mintedPredicates}`,
          String(metrics.annotations),
          total,
          String(seconds),
        ]);
      }
      log(
        '\nComparison (finance = share of extracted facts on finance terms; minted = facts/predicates):',
        ...table(rows),
      );
      expect(rows.length).toBeGreaterThan(1);
    },
    60 * 60_000,
  );
});
