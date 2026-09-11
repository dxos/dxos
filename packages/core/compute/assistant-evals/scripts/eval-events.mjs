//
// Copyright 2026 DXOS.org
//

/**
 * Turns an evalite JSON export into the events the nightly trends in PostHog, plus a markdown
 * summary for the job.
 *
 *   evalite run src/evals --outputPath out/evals.json
 *   node scripts/eval-events.mjs out/evals.json --run <run-id> --events out/evals.events.ndjson --summary out/summary.md
 *   node ../../../../scripts/ci-event.mjs --batch out/evals.events.ndjson
 *
 * Three events, at three grains, so the dashboard aggregates raw rows rather than shipped averages:
 * `ci.eval.run` once, `ci.eval.result` per test case, `ci.eval.score` per scorer of a test case.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const EVALS_DIR = path.resolve(import.meta.dirname, '../src/evals');

/**
 * evalite's SQLite storage stamps rows with `datetime('now')`, a UTC wall-clock string with no zone,
 * which `Date` would otherwise read as local time.
 */
const toIso = (created) => {
  const utc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(created) ? `${created.replace(' ', 'T')}Z` : created;
  return new Date(utc).toISOString();
};

const defined = (record) => Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

const sum = (items, pick) => items.reduce((total, item) => total + (pick(item) ?? 0), 0);

const mean = (values) => (values.length === 0 ? undefined : sum(values, (value) => value) / values.length);

/**
 * The model calls behind a result, as the runner reported them (`src/Usage.ts`): one trace per call,
 * tokens on the trace and the model on its output. Summed here, priced where the events are read.
 */
const usage = (traces) => {
  const models = [...new Set(traces.map((trace) => trace.output?.model).filter(Boolean))].sort();
  const priced = traces.filter((trace) => typeof trace.output?.costUsd === 'number');
  return defined({
    models: models.join(','),
    llmCalls: traces.length,
    inputTokens: sum(traces, (trace) => trace.inputTokens),
    outputTokens: sum(traces, (trace) => trace.outputTokens),
    cacheReadTokens: sum(traces, (trace) => trace.output?.cacheReadTokens),
    cacheWriteTokens: sum(traces, (trace) => trace.output?.cacheWriteTokens),
    // Only where every call carried the caller's own price; a partial sum would read as the whole.
    costUsd:
      traces.length > 0 && priced.length === traces.length ? sum(priced, (trace) => trace.output.costUsd) : undefined,
  });
};

/** evalite's ids restart every run, so a case is keyed by what it asks. */
const itemId = (file, evaluation, result) =>
  createHash('sha1')
    .update(JSON.stringify([file, evaluation.name, evaluation.variantName ?? null, result.input]))
    .digest('hex')
    .slice(0, 16);

/** The events one export yields, in the shape `scripts/ci-event.mjs --batch` reads. */
export const toEvents = (report, { run: runId } = {}) => {
  const timestamp = toIso(report.run.createdAt);
  const runKey = runId ?? report.run.createdAt;

  const results = [];
  const scores = [];
  for (const evaluation of report.evals) {
    const file = path.relative(EVALS_DIR, evaluation.filepath);
    const context = defined({ eval: evaluation.name, file, variant: evaluation.variantName ?? undefined });
    evaluation.results.forEach((result, index) => {
      results.push({
        event: 'ci.eval.result',
        timestamp,
        dedup: `${runKey}:${evaluation.id}:${result.id}`,
        properties: {
          ...context,
          itemId: itemId(file, evaluation, result),
          index,
          status: result.status,
          score: result.averageScore,
          durationMs: result.duration,
          ...usage(result.traces),
        },
      });
      for (const score of result.scores) {
        scores.push({
          event: 'ci.eval.score',
          timestamp,
          dedup: `${runKey}:${evaluation.id}:${result.id}:${score.name}`,
          properties: {
            ...context,
            itemId: itemId(file, evaluation, result),
            index,
            status: result.status,
            scorer: score.name,
            score: score.score,
          },
        });
      }
    });
  }

  const run = {
    event: 'ci.eval.run',
    timestamp,
    dedup: runKey,
    properties: defined({
      evals: report.evals.length,
      results: results.length,
      failedResults: results.filter((entry) => entry.properties.status !== 'success').length,
      meanScore: mean(scores.map((entry) => entry.properties.score)),
      // evalite's export hardcodes each eval's `duration` to 0.
      durationMs: sum(results, (entry) => entry.properties.durationMs),
      ...usage(report.evals.flatMap((evaluation) => evaluation.results.flatMap((result) => result.traces))),
    }),
  };

  return [run, ...results, ...scores];
};

const percent = (score) => (score === undefined ? '–' : `${Math.round(score * 100)}%`);

const seconds = (millis) => `${(millis / 1000).toFixed(1)}s`;

const tokens = (count = 0) => (count >= 10_000 ? `${Math.round(count / 1000)}k` : String(count));

/** One row per eval, for the job summary; a failed scorer is named so the row explains itself. */
export const toSummary = (report) => {
  const rows = report.evals.map((evaluation) => {
    const file = path.relative(EVALS_DIR, evaluation.filepath);
    const failed = evaluation.results
      .flatMap((result) => result.scores.filter((score) => score.score < 1).map((score) => score.name))
      .filter((name, index, names) => names.indexOf(name) === index);
    const status = evaluation.status === 'success' ? '✅' : '❌';
    // evalite already suffixes a variant's name with `[variant]`.
    const duration = sum(evaluation.results, (result) => result.duration);
    const { models = '', inputTokens, outputTokens } = usage(evaluation.results.flatMap((result) => result.traces));
    return `| ${status} | ${evaluation.name} | \`${file}\` | ${percent(evaluation.averageScore)} | ${seconds(duration)} | ${models} | ${tokens(inputTokens)} / ${tokens(outputTokens)} | ${failed.join(', ')} |`;
  });
  const allScores = report.evals.flatMap((evaluation) =>
    evaluation.results.flatMap((result) => result.scores.map((score) => score.score)),
  );
  return [
    `## Assistant evals`,
    '',
    `${report.evals.length} evals, mean score ${percent(mean(allScores))}, ${report.evals.filter((evaluation) => evaluation.status !== 'success').length} failed.`,
    '',
    '| | Eval | File | Score | Duration | Models | Tokens in / out | Scorers below 100% |',
    '| :-: | :-- | :-- | --: | --: | :-- | --: | :-- |',
    ...rows,
    '',
  ].join('\n');
};

const main = () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      run: { type: 'string' },
      events: { type: 'string' },
      summary: { type: 'string' },
    },
  });
  const [input] = positionals;
  if (!input) {
    throw new Error(
      'usage: eval-events.mjs <evalite-export.json> [--run <id>] [--events <file.ndjson>] [--summary <file.md>]',
    );
  }
  const report = JSON.parse(readFileSync(input, 'utf8'));

  if (values.events) {
    const events = toEvents(report, { run: values.run });
    writeFileSync(values.events, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
    console.log(`wrote ${events.length} event(s) to ${values.events}`);
  }
  if (values.summary) {
    writeFileSync(values.summary, toSummary(report));
    console.log(`wrote summary to ${values.summary}`);
  }
};

if (import.meta.filename === process.argv[1]) {
  main();
}
