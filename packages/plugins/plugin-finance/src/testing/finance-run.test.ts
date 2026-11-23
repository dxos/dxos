//
// Copyright 2026 DXOS.org
//
// @vitest-environment node

// The finance pipeline end to end: every keyless source → its ECHO feed (deduped on the item's foreign key) → one RDF
// fact store. Text items (news, press releases, central banks, Reddit, crypto) go through LLM extraction with the
// finance ontology, the ticker mention index, sentiment and event classification; structured rows (prices, FINRA short
// volume, Form 4, 13F, filings, House disclosures) become facts without a model. Reruns resume: ingest adds only new
// items, extraction skips items whose cursor matches. Every model call is metered into trace.jsonl.
//   [FINANCE_DIR=~/.local/share/dxos/finance] [FINANCE_STEPS=ingest,extract] [FINANCE_SOURCES=text,edgar,market,house]
//   [FINANCE_DAYS=31]
//   [FINANCE_SAMPLE=n] [FINANCE_THINKING=1] [FINANCE_SENTIMENT=llm|lexicon]  moon run plugin-finance:run
//
// `moon run plugin-finance:experiment` compares text-extraction configurations over a sample of the ingested news,
// and `moon run plugin-finance:query` prints one ticker's sentiment, prices, short volume and insider trades.
//
// They write to persistent locations, so they run only from their moon tasks (which set FINANCE_PIPELINE /
// FINANCE_EXPERIMENT / FINANCE_QUERY).

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { type AiService } from '@dxos/ai';
import { DirectAiServiceLayer } from '@dxos/ai/testing';
import { Database } from '@dxos/echo';
import { Vocabularies } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { FactStore, FactStoreLive } from '@dxos/pipeline-rdf';
import * as Subscription from '@dxos/plugin-magazine/Subscription';

import { Finance } from '#types';

import * as FinancePipeline from '../pipeline/pipeline.ts';
import { companyIri, ontology } from '../pipeline/vocabulary.ts';
import {
  DATA_FEEDS,
  SOURCE_GROUPS,
  type SourceGroup,
  type SourceResult,
  TEXT_FEEDS,
  ingest,
} from '../sources/ingest.ts';
import { type TextItem, fromPost } from '../sources/text-item.ts';
import * as FinanceSpace from '../store/finance-space.ts';
import { costReport, meter } from './metering.ts';
import { crossSourceReport, factMetrics, perDay, runLog, sample, sentimentAgreement, withinDays } from './report.ts';

const dir = process.env.FINANCE_DIR ?? join(homedir(), '.local/share/dxos/finance');
const dataRoot = join(dir, 'echo');
const factsPath = join(dir, 'facts.db');
const days = Number(process.env.FINANCE_DAYS ?? 31);
const hasKey = Boolean(process.env.DX_ANTHROPIC_API_KEY);

const isSourceGroup = (name: string): name is SourceGroup => SOURCE_GROUPS.some((group) => group === name);

/** The text items and observations the ECHO feeds hold. */
const readFeeds = () =>
  Effect.gen(function* () {
    const text: TextItem[] = [];
    const observations: Finance.Observation[] = [];
    const counts: Record<string, number> = {};
    for (const name of TEXT_FEEDS) {
      const posts = yield* FinanceSpace.items(yield* FinanceSpace.feedFor(name), Subscription.Post);
      counts[name] = posts.length;
      text.push(...posts.flatMap((post) => fromPost(post) ?? []));
    }
    for (const name of DATA_FEEDS) {
      const rows = yield* FinanceSpace.items(yield* FinanceSpace.feedFor(name), Finance.Observation);
      counts[name] = rows.length;
      observations.push(...rows);
    }
    return { text, observations, counts };
  });

/** Runs `program` against the ECHO space and the fact store, with metered model calls. */
const withStores = <A>(
  facts: string,
  tracePath: string,
  program: Effect.Effect<A, unknown, Database.Service | FactStore | AiService.AiService>,
) => {
  mkdirSync(dir, { recursive: true });
  const metering = meter(DirectAiServiceLayer, tracePath);
  return EffectEx.runPromise(
    Effect.gen(function* () {
      const { db } = yield* FinanceSpace.open(dataRoot);
      return yield* program.pipe(
        Effect.provide(Layer.mergeAll(Database.layer(db), FactStoreLive.layerFile(facts), metering.layer)),
      );
    }).pipe(Effect.scoped),
  ).then((result) => ({ result, events: metering.events() }));
};

const table = (rows: string[][]): string[] => {
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  return rows.map(
    (row) =>
      `  ${row.map((cell, column) => (column === 0 ? cell.padEnd(widths[column]) : cell.padStart(widths[column]))).join('  ')}`,
  );
};

describe('finance pipeline', () => {
  test.skipIf(!process.env.FINANCE_PIPELINE)(
    'runs the finance pipeline: sources → ECHO feeds → fact store',
    async ({ expect }) => {
      const log = runLog(join(dir, 'run.log'));
      const steps = new Set((process.env.FINANCE_STEPS ?? 'ingest,extract').split(','));
      log(`\n== run ${new Date().toISOString()}: steps ${[...steps].join(',')}; echo ${dataRoot}; facts ${factsPath}`);

      const { result, events } = await withStores(
        factsPath,
        join(dir, 'trace.jsonl'),
        Effect.gen(function* () {
          if (steps.has('ingest')) {
            const results = yield* ingest({
              ...(process.env.FINANCE_SOURCES
                ? { only: process.env.FINANCE_SOURCES.split(',').filter(isSourceGroup) }
                : {}),
              onResult: ({ feed, source, fetched, added, error }: SourceResult) =>
                log(
                  `  ${feed.padEnd(20)} ${source.padEnd(46)} ${error ? `FAILED ${error}` : `${String(fetched).padStart(5)} fetched ${String(added).padStart(5)} new`}`,
                ),
            });
            const failed = results.filter(({ error }) => error);
            log(
              `ingest:  ${results.length} sources, ${failed.length} failed: ${failed.map(({ source }) => source).join(', ')}`,
            );
          }
          const { text, observations, counts } = yield* readFeeds();
          log(
            `feeds:   ${Object.entries(counts)
              .map(([name, count]) => `${name} ${count}`)
              .join(', ')}`,
          );
          if (!steps.has('extract')) {
            return { facts: [] };
          }
          const recent = withinDays(text, days);
          const items = process.env.FINANCE_SAMPLE ? sample(recent, Number(process.env.FINANCE_SAMPLE)) : recent;
          const range = perDay(items);
          log(`text:    ${items.length} items over ${range.length} days (${range[0]?.[0]} … ${range.at(-1)?.[0]})`);
          const structured = yield* FinancePipeline.extractObservations(observations);
          log(
            `data:    ${structured.observations} rows, ${structured.extracted} written as ${structured.facts} facts (no model)`,
          );
          if (hasKey) {
            const options: FinancePipeline.FinancePipelineOptions = {
              // Without thinking: on the experiment sample it found more facts (0.97 against 0.71 per item) at half the cost.
              extract: { thinking: process.env.FINANCE_THINKING === '1' },
              annotate: { sentiment: process.env.FINANCE_SENTIMENT === 'lexicon' ? 'lexicon' : 'llm' },
            };
            log(`config:  ${FinancePipeline.describe(options)}`);
            const summary = yield* FinancePipeline.run(items, options);
            log(
              `text:    extracted ${summary.extracted} items (${summary.extractedFacts} facts), annotated ${summary.annotated} (${summary.annotationFacts} facts), ${summary.failedBatches} failed batch(es)`,
            );
          } else {
            log('text:    skipped (no DX_ANTHROPIC_API_KEY)');
          }
          return { facts: yield* (yield* FactStore).query({}), items };
        }),
      );

      if (result.facts.length > 0) {
        const metrics = factMetrics(result.facts);
        log(
          `store:   ${result.facts.length} facts: ${metrics.extracted} extracted on ${metrics.predicates} predicates (${metrics.onFinance} on finance terms, ${metrics.minted} on ${metrics.mintedPredicates} minted), ${metrics.annotations} annotation/structured`,
          `top:     ${metrics.top.map(([name, count]) => `${name} ${count}`).join(', ')}`,
          ...('items' in result && result.items
            ? [`sentiment: ${JSON.stringify(sentimentAgreement(result.items, result.facts).distribution)}`]
            : []),
        );
      }
      log(...costReport(events, 0));
      expect(true).toBe(true);
    },
    4 * 60 * 60_000,
  );

  test.skipIf(!process.env.FINANCE_EXPERIMENT || !hasKey)(
    'compares pipeline configurations over a sample',
    async ({ expect }) => {
      const log = runLog(join(dir, 'experiments', 'experiments.log'));
      const configs: Record<string, FinancePipeline.FinancePipelineOptions> = {
        // Generic packs (schema, foaf, dcterms, org, sioc), no finance terms; deterministic annotation only.
        'generic+lexicon': {
          extract: { ontology: Vocabularies.DEFAULT },
          annotate: { sentiment: 'lexicon', linkNames: false, events: false },
        },
        // The finance packs, thinking on; every annotation stage on the model.
        'finance+llm': { extract: { ontology: ontology() }, annotate: {} },
        // The finance packs without thinking.
        'finance-nothink': { extract: { ontology: ontology(), thinking: false }, annotate: false },
        // The finance packs, thinking on, in transcripts of 10 items rather than 25.
        'finance-batch10': { extract: { ontology: ontology(), batchSize: 10 }, annotate: false },
      };
      const only = process.env.FINANCE_CONFIGS?.split(',');
      const rows: string[][] = [['config', 'extracted', 'facts/item', 'preds', 'finance', 'minted', 'annot', 'USD']];
      for (const [name, options] of Object.entries(configs)) {
        if (only && !only.includes(name)) {
          continue;
        }
        const path = join(dir, 'experiments', `${name}.db`);
        rmSync(path, { force: true });
        const { result, events } = await withStores(
          path,
          join(dir, 'experiments', 'trace.jsonl'),
          Effect.gen(function* () {
            const { text } = yield* readFeeds();
            const items = sample(withinDays(text, days), Number(process.env.FINANCE_SAMPLE ?? 100));
            yield* FinancePipeline.run(items, options);
            return { items, facts: yield* (yield* FactStore).query({}) };
          }),
        );
        const metrics = factMetrics(result.facts, 10);
        const agreement = sentimentAgreement(result.items, result.facts);
        const cost = costReport(events, result.items.length);
        log(
          `\n-- ${name} (${result.items.length} items): ${FinancePipeline.describe(options)}`,
          `top:   ${metrics.top.map(([predicate, count]) => `${predicate} ${count}`).join(', ')}`,
          ...(agreement.rated > 0
            ? [
                `sentiment: ${JSON.stringify(agreement.distribution)}; lexicon agrees on ${agreement.agree}/${agreement.rated}`,
              ]
            : []),
          ...cost,
        );
        rows.push([
          name,
          String(metrics.extracted),
          (metrics.extracted / Math.max(1, result.items.length)).toFixed(2),
          String(metrics.predicates),
          `${Math.round((metrics.onFinance / Math.max(1, metrics.extracted)) * 100)}%`,
          `${metrics.minted}/${metrics.mintedPredicates}`,
          String(metrics.annotations),
          /total \$([0-9.]+)/.exec(cost.join('\n'))?.[1] ?? '0',
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

  test.skipIf(!process.env.FINANCE_QUERY)(
    'joins sources on one ticker',
    async ({ expect }) => {
      const ticker = process.env.FINANCE_TICKER ?? 'NVDA';
      const lines = await EffectEx.runPromise(
        crossSourceReport(companyIri(ticker), ticker).pipe(Effect.provide(FactStoreLive.layerFile(factsPath))),
      );
      for (const line of lines) {
        console.log(line);
      }
      expect(lines.length).toBeGreaterThan(0);
    },
    10 * 60_000,
  );
});
