//
// Copyright 2026 DXOS.org
//

/**
 * Reads the latest run from evalite's store and sends each result to PostHog as an `$ai_trace`
 * root over the generations the runner already sent, plus one `$ai_evaluation` per scorer, and
 * writes a markdown summary for the job.
 *
 *   evalite run src/evals
 *   node scripts/eval-events.mjs --summary out/summary.md --posthog
 *
 * The store rather than evalite's `--outputPath` JSON: that export is written by the reporter
 * after it prints the failures, and a failed scenario's stack trace can crash the print
 * (`vitest`'s `printError` on evalite's task objects), losing the night's data with it. The rows
 * are already in SQLite by then.
 *
 * The runner (`src/Observe.ts`) left the trace and experiment ids on each result's evalite traces.
 * The root and the scores are sent from here rather than in-process because evalite names and
 * scores a result only after the task returns, and runs a file's evals concurrently, so nothing
 * in-process can tell which eval it is serving. The property names follow PostHog's own eval
 * harness (`products/posthog_ai/eval_harness/trace_events.py`), which is what its offline-evals
 * view reads.
 */

import { createSqliteStorage } from 'evalite/sqlite-storage';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PostHog } from 'posthog-node';

const DISTINCT_ID = 'assistant-evals';

/** Where evalite discovers scenarios; file names are reported relative to it. */
const EVALS_DIR = path.resolve(import.meta.dirname, '../src/evals');

/** evalite's own location for its store, relative to the package it ran in. */
const STORE = path.resolve(import.meta.dirname, '../node_modules/.evalite/cache.sqlite');

/**
 * The latest full run, in the shape of evalite's JSON export: evals with their results, each
 * result with its scores and traces.
 */
export const readLatestRun = async (storePath = STORE) => {
  const storage = await createSqliteStorage(storePath);
  const [run] = await storage.runs.getMany({
    runType: 'full',
    orderBy: 'created_at',
    orderDirection: 'desc',
    limit: 1,
  });
  if (!run) {
    throw new Error(`No completed run in ${storePath}.`);
  }
  const evals = await storage.evals.getMany({ runIds: [run.id], statuses: ['fail', 'success'] });
  const results = await storage.results.getMany({ evalIds: evals.map((evaluation) => evaluation.id) });
  const resultIds = results.map((result) => result.id);
  const scores = await storage.scores.getMany({ resultIds });
  const traces = await storage.traces.getMany({ resultIds });
  const meanOf = (rows) => (rows.length === 0 ? 0 : sum(rows, (row) => row.score) / rows.length);
  return {
    run: { id: run.id, createdAt: run.created_at },
    evals: evals.map((evaluation) => {
      const own = results.filter((result) => result.eval_id === evaluation.id);
      return {
        name: evaluation.name,
        filepath: evaluation.filepath,
        status: evaluation.status,
        variantName: evaluation.variant_name,
        averageScore: meanOf(scores.filter((score) => own.some((result) => result.id === score.result_id))),
        results: own.map((result) => {
          const ownScores = scores.filter((score) => score.result_id === result.id);
          return {
            id: result.id,
            duration: result.duration,
            input: result.input,
            output: result.output,
            status: result.status,
            createdAt: result.created_at,
            averageScore: meanOf(ownScores),
            scores: ownScores.map((score) => ({
              name: score.name,
              score: score.score,
              description: score.description,
            })),
            traces: traces
              .filter((trace) => trace.result_id === result.id)
              .map((trace) => ({
                output: trace.output,
                startTime: trace.start_time,
                inputTokens: trace.input_tokens,
                outputTokens: trace.output_tokens,
              })),
          };
        }),
      };
    }),
  };
};

const sum = (items, pick) => items.reduce((total, item) => total + (pick(item) ?? 0), 0);

const mean = (values) => (values.length === 0 ? undefined : sum(values, (value) => value) / values.length);

/**
 * A test case's identity across runs: what it asks, not where it sits. `index` shifts when a case
 * is inserted above it, and evalite's ids restart every run, so neither can key a case's trend.
 */
const itemId = (file, evaluation, result) =>
  createHash('sha1')
    .update(JSON.stringify([file, evaluation.name, evaluation.variantName ?? null, result.input]))
    .digest('hex')
    .slice(0, 16);

/** The runner leaves the same link on every trace of a result. */
const link = (result) => result.traces.find((trace) => trace.output?.traceId)?.output;

/**
 * The model calls behind a result, as the runner reported them (`src/Usage.ts`): one trace per call,
 * tokens on the trace and the model on its output.
 */
const usage = (traces) => ({
  models: [...new Set(traces.map((trace) => trace.output?.model).filter(Boolean))].sort().join(','),
  llmCalls: traces.length,
  inputTokens: sum(traces, (trace) => trace.inputTokens),
  outputTokens: sum(traces, (trace) => trace.outputTokens),
});

/**
 * evalite's SQLite storage stamps rows with `datetime('now')`, a UTC wall-clock string with no zone,
 * which `Date` would otherwise read as local time.
 */
const toIso = (created) => {
  const utc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(created) ? `${created.replace(' ', 'T')}Z` : created;
  return new Date(utc).toISOString();
};

/**
 * Per result: the `$ai_trace` root, then one `$ai_evaluation` per scorer, in the shape the
 * offline-evals view groups by. A result whose run never reached the model has no trace, and its
 * scores then name the experiment alone.
 */
export const toEvents = (report, experiment) =>
  report.evals.flatMap((evaluation) => {
    const file = path.relative(EVALS_DIR, evaluation.filepath);
    return evaluation.results.flatMap((result) => {
      const target = link(result);
      const experimentId = target?.experimentId ?? experiment?.id;
      if (!experimentId) {
        return [];
      }
      const item = {
        ai_product: 'evals',
        $ai_experiment_id: experimentId,
        $ai_experiment_name: target?.experimentName ?? experiment?.name,
        $ai_experiment_item_id: itemId(file, evaluation, result),
        $ai_experiment_item_name: evaluation.name,
        evalFile: file,
        evalVariant: evaluation.variantName ?? undefined,
      };
      // The generations carry their own start times; the root is dated at the first one, and the
      // result's storage time stands in when nothing was generated.
      const startedAt = Math.min(...result.traces.map((trace) => trace.startTime), Date.parse(toIso(result.createdAt)));
      const root = target
        ? [
            {
              event: '$ai_trace',
              timestamp: new Date(startedAt),
              properties: {
                ...item,
                $ai_trace_id: target.traceId,
                $ai_trace_name: evaluation.name,
                $ai_latency: result.duration / 1000,
                $ai_input_state: { input: result.input },
                $ai_output_state: {
                  output: result.output,
                  scores: Object.fromEntries(result.scores.map((score) => [score.name, score.score])),
                },
                $ai_is_error: result.status === 'success' ? undefined : true,
              },
            },
          ]
        : [];
      const scores = result.scores.map((score) => ({
        event: '$ai_evaluation',
        timestamp: new Date(toIso(result.createdAt)),
        properties: {
          ...item,
          $ai_eval_source: 'assistant-evals',
          $ai_evaluation_type: 'offline',
          $ai_metric_name: score.name,
          $ai_metric_version: '1',
          $ai_result_type: 'numeric',
          $ai_score_min: 0,
          $ai_score_max: 1,
          $ai_status: result.status === 'success' ? 'ok' : 'error',
          $ai_score: score.score,
          $ai_reasoning: score.description,
          $ai_input: result.input,
          $ai_output: result.output,
          ...(target
            ? { $ai_trace_id: target.traceId, $ai_target_id: target.traceId, $ai_target_type: 'trace_id' }
            : {}),
        },
      }));
      return [...root, ...scores];
    });
  });

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
    // evalite's reporter hardcodes each eval's duration to zero; the results carry the real one.
    const duration = sum(evaluation.results, (result) => result.duration);
    const { models, inputTokens, outputTokens } = usage(evaluation.results.flatMap((result) => result.traces));
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

const main = async () => {
  const { values } = parseArgs({
    options: {
      store: { type: 'string', default: STORE },
      summary: { type: 'string' },
      posthog: { type: 'boolean', default: false },
    },
  });
  const report = await readLatestRun(values.store);

  if (values.summary) {
    writeFileSync(values.summary, toSummary(report));
    console.log(`wrote summary to ${values.summary}`);
  }

  if (values.posthog) {
    const apiKey = process.env.DX_EVALS_POSTHOG_API_KEY;
    if (!apiKey) {
      console.log('::notice::DX_EVALS_POSTHOG_API_KEY is unset — skipping the evaluation events.');
      return;
    }
    // A result whose run never reached the model has no link; the environment names the experiment
    // the runner would have used for it.
    const experiment = process.env.DX_EVAL_RUN_ID
      ? { id: process.env.DX_EVAL_RUN_ID, name: `assistant-evals/${process.env.DX_EVAL_RUN_NAME ?? 'local'}` }
      : undefined;
    const events = toEvents(report, experiment);
    const client = new PostHog(apiKey, { host: process.env.DX_EVALS_POSTHOG_HOST ?? 'https://eu.i.posthog.com' });
    for (const event of events) {
      client.capture({ distinctId: DISTINCT_ID, ...event });
    }
    await client.shutdown();
    console.log(`sent ${events.length} event(s): ${[...new Set(events.map((event) => event.event))].join(', ')}`);
  }
};

if (import.meta.filename === process.argv[1]) {
  await main();
}
