//
// Copyright 2026 DXOS.org
//

/**
 * Turns an evalite JSON export into the events the nightly trends in PostHog, plus a markdown
 * summary for the job.
 *
 *   evalite run src/evals --outputPath out/evals.json
 *   node scripts/eval-events.mjs out/evals.json --events out/evals.events.ndjson --summary out/summary.md
 *   node ../../../../scripts/ci-event.mjs --batch out/evals.events.ndjson
 *
 * Three events, at three grains, so the dashboard aggregates raw rows rather than shipped averages:
 * `ci.eval.run` once, `ci.eval.result` per test case, `ci.eval.score` per scorer of a test case.
 * Every event carries the run's timestamp, not the commit's: the schedule fires against whatever
 * main is, and two nights on one commit are two samples of a non-deterministic system, not one.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

/** Where evalite discovers scenarios; file names are reported relative to it. */
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

/** The events one export yields, in the shape `scripts/ci-event.mjs --batch` reads. */
export const toEvents = (report) => {
  const timestamp = toIso(report.run.createdAt);
  // Fresh storage per CI run means evalite's own ids restart at 1, so the run's time is what keeps
  // one night's rows apart from the next night's on the same commit.
  const runKey = report.run.createdAt;

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
          index,
          status: result.status,
          score: result.averageScore,
          durationMs: result.duration,
        },
      });
      for (const score of result.scores) {
        scores.push({
          event: 'ci.eval.score',
          timestamp,
          dedup: `${runKey}:${evaluation.id}:${result.id}:${score.name}`,
          properties: {
            ...context,
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
      // Over every scorer of every result, which is the number evalite prints as the run's score.
      meanScore: mean(scores.map((entry) => entry.properties.score)),
      // Summed agent time, not wall clock: scenarios run concurrently, and the export's per-eval
      // duration is always zero.
      durationMs: sum(results, (entry) => entry.properties.durationMs),
    }),
  };

  return [run, ...results, ...scores];
};

const percent = (score) => (score === undefined ? '–' : `${Math.round(score * 100)}%`);

const seconds = (millis) => `${(millis / 1000).toFixed(1)}s`;

/** One row per eval, for the job summary; a failed scorer is named so the row explains itself. */
export const toSummary = (report) => {
  const rows = report.evals.map((evaluation) => {
    const file = path.relative(EVALS_DIR, evaluation.filepath);
    const failed = evaluation.results
      .flatMap((result) => result.scores.filter((score) => score.score < 1).map((score) => score.name))
      .filter((name, index, names) => names.indexOf(name) === index);
    const status = evaluation.status === 'success' ? '✅' : '❌';
    const name = evaluation.variantName ? `${evaluation.name} (${evaluation.variantName})` : evaluation.name;
    const duration = sum(evaluation.results, (result) => result.duration);
    return `| ${status} | ${name} | \`${file}\` | ${percent(evaluation.averageScore)} | ${seconds(duration)} | ${failed.join(', ')} |`;
  });
  const allScores = report.evals.flatMap((evaluation) =>
    evaluation.results.flatMap((result) => result.scores.map((score) => score.score)),
  );
  return [
    `## Assistant evals`,
    '',
    `${report.evals.length} evals, mean score ${percent(mean(allScores))}, ${report.evals.filter((evaluation) => evaluation.status !== 'success').length} failed.`,
    '',
    '| | Eval | File | Score | Duration | Scorers below 100% |',
    '| :-: | :-- | :-- | --: | --: | :-- |',
    ...rows,
    '',
  ].join('\n');
};

const main = () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      events: { type: 'string' },
      summary: { type: 'string' },
    },
  });
  const [input] = positionals;
  if (!input) {
    throw new Error('usage: eval-events.mjs <evalite-export.json> [--events <file.ndjson>] [--summary <file.md>]');
  }
  const report = JSON.parse(readFileSync(input, 'utf8'));

  if (values.events) {
    const events = toEvents(report);
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
