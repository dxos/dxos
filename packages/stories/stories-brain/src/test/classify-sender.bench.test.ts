//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import {
  ALL_VARIANTS,
  SENDER_LABELS,
  type SenderClass,
  type SenderResult,
  classifySender,
  classifySenderHeuristic,
  fixtureExists,
  loadFixtureMessages,
  runLadder,
  scoreSenders,
  selectVariants,
  toRelative,
  trackProgress,
  uniqueSenders,
  writeResponses,
  writeResults,
} from '../testing/harness';
import { SENDER_HYBRID_THRESHOLD, SENDER_LABEL_MODEL } from './defs';

// Sender-type triage eval (REPORT §5): does classify-sender reliably split PERSON from ORG mail? It
// gates all downstream LLM spend (draft only to people, label — not summarize — org mail), so it needs
// a ground-truth measurement, not agreement-with-a-model. Two entry points:
//
//   1. `bootstrap ...` (runs when no gold set exists) — labels every unique sender with the strongest
//      model and writes a `.candidate.json` for a HUMAN to review + promote to the gold path.
//   2. `classify-sender ...` (runs once a gold set exists) — scores the heuristic, each model, and the
//      hybrid (heuristic-when-confident-else-model) against the human gold set.

/** The gold set lives one directory up from a per-sender review file; derive the candidate sibling. */
const CANDIDATE_LABELS = SENDER_LABELS.replace(/\.json$/, '.candidate.json');

/** The persisted gold-set file shape. */
type SenderLabelsFile = {
  readonly generatedBy?: string;
  readonly generatedAt?: string;
  readonly reviewed?: boolean;
  readonly note?: string;
  readonly labels: Record<string, SenderClass>;
};

const readLabels = (path: string): ReadonlyMap<string, SenderClass> => {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as SenderLabelsFile;
  return new Map(Object.entries(parsed.labels ?? {}).map(([email, klass]) => [email.toLowerCase(), klass] as const));
};

const round = (value: number): number => Math.round(value * 1000) / 1000;

// ---------------------------------------------------------------------------------------------------
// Bootstrap — seed a candidate gold set for human review (no gold set yet).
// ---------------------------------------------------------------------------------------------------

describe.skipIf(!fixtureExists() || existsSync(SENDER_LABELS))('classify-sender — bootstrap gold set', () => {
  test(
    'label every sender with the strong model for human review',
    async ({ expect }) => {
      const senders = uniqueSenders(loadFixtureMessages({ limit: undefined }));
      const variant = ALL_VARIANTS.find((entry) => entry.name.includes(SENDER_LABEL_MODEL)) ?? ALL_VARIANTS.at(-1);
      if (!variant) {
        throw new Error('No model variants available for sender labeling.');
      }
      log.info('bootstrapping sender labels', { senders: senders.length, model: variant.name });

      const progress = trackProgress('classify-sender:bootstrap', senders.length);
      const [ladder] = await runLadder({
        variants: [variant],
        items: senders,
        task: (sender, model) => classifySender(sender, model),
        onItem: () => progress.advance(),
      });
      progress.done();

      const labels: Record<string, SenderClass> = {};
      for (const run of ladder.runs) {
        labels[run.output.email] = run.output.class;
      }
      const file: SenderLabelsFile = {
        generatedBy: variant.name,
        generatedAt: new Date().toISOString(),
        reviewed: false,
        note: `Candidate labels — REVIEW and correct, then rename to ${toRelative(SENDER_LABELS)} to enable the eval.`,
        labels,
      };
      writeFileSync(CANDIDATE_LABELS, JSON.stringify(file, null, 2));
      log.info('wrote candidate sender labels', {
        path: toRelative(CANDIDATE_LABELS),
        labelled: Object.keys(labels).length,
        review: `correct + rename to ${toRelative(SENDER_LABELS)}`,
      });

      expect(Object.keys(labels).length).toBeGreaterThan(0);
    },
    12 * 60 * 60_000,
  );
});

// ---------------------------------------------------------------------------------------------------
// Eval — score every arm against the human-reviewed gold set.
// ---------------------------------------------------------------------------------------------------

type Row = {
  readonly arm: string;
  readonly scored: number;
  readonly accuracy: number;
  readonly macroF1: number;
  readonly personF1: number;
  readonly orgF1: number;
  /** Confusion (gold → predicted). */
  readonly confusion: Record<string, number>;
  /** For hybrid arms: fraction of senders deferred to the model. */
  readonly deferred?: number;
  readonly latencyP50?: number;
  readonly latencyP95?: number;
};

describe.skipIf(!fixtureExists() || !existsSync(SENDER_LABELS))('classify-sender — ground-truth eval', () => {
  test(
    'heuristic / hybrid / models vs the gold set',
    async ({ expect }) => {
      const gold = readLabels(SENDER_LABELS);
      const variants = selectVariants();
      // Score only the labelled senders — the gold set may cover a subset, and it bounds LLM cost.
      const allSenders = uniqueSenders(loadFixtureMessages({ limit: undefined }));
      const senders = allSenders.filter((sender) => gold.has(sender.email));
      log.info('classify-sender eval', {
        goldSize: gold.size,
        scoredSenders: senders.length,
        models: variants.map((variant) => variant.name),
        hybridThreshold: SENDER_HYBRID_THRESHOLD,
      });
      expect(senders.length).toBeGreaterThan(0);

      const rows: Row[] = [];
      const rowOf = (
        arm: string,
        predictions: readonly SenderResult[],
        extra: { deferred?: number; latencyP50?: number; latencyP95?: number } = {},
      ): Row => {
        const score = scoreSenders(predictions, gold);
        return {
          arm,
          scored: score.scored,
          accuracy: score.accuracy,
          macroF1: score.macroF1,
          personF1: score.personF1,
          orgF1: score.orgF1,
          confusion: score.confusion,
          ...extra,
        };
      };

      // Arm 1 — heuristic only (deterministic, foreground, zero-latency).
      const heuristic = senders.map((sender) => classifySenderHeuristic(sender));
      rows.push(rowOf('heuristic', heuristic, { latencyP50: 0, latencyP95: 0 }));

      // Arm 2 — each model over the labelled senders (with latency).
      const progress = trackProgress('classify-sender:eval', variants.length * senders.length);
      const ladder = await runLadder({
        variants,
        items: senders,
        task: (sender, variant) => classifySender(sender, variant),
        onItem: () => progress.advance(),
      });
      progress.done();

      // Which senders the hybrid defers to the model (heuristic below the confidence threshold).
      const defers = senders.map((sender, index) => heuristic[index].confidence < SENDER_HYBRID_THRESHOLD);
      const deferred = round(defers.filter(Boolean).length / Math.max(1, senders.length));

      for (const entry of ladder) {
        const modelPredictions = entry.runs.map((run) => run.output);
        rows.push(
          rowOf(entry.model, modelPredictions, {
            latencyP50: entry.latency.p50,
            latencyP95: entry.latency.p95,
          }),
        );
        // Arm 3 — hybrid derived per model: heuristic when confident, else this model's prediction. No
        // extra LLM calls — reuses the model's already-computed labels for the deferred senders only.
        const hybrid = senders.map((_, index) => (defers[index] ? modelPredictions[index] : heuristic[index]));
        rows.push(rowOf(`hybrid:${entry.model}`, hybrid, { deferred }));
      }

      writeResults('classify-sender', {
        name: 'classify-sender',
        generatedAt: new Date().toISOString(),
        goldSize: gold.size,
        scoredSenders: senders.length,
        hybridThreshold: SENDER_HYBRID_THRESHOLD,
        models: variants.map((variant) => variant.name),
        rows,
      });
      writeResponses('classify-sender', renderReport(rows, gold.size, senders.length));

      expect(rows.length).toBeGreaterThan(1);
    },
    12 * 60 * 60_000,
  );
});

/** Renders the accuracy × class-F1 × latency matrix plus the recommended arm. */
const renderReport = (rows: readonly Row[], goldSize: number, scored: number): { title: string; body: string }[] => {
  const cell = (value: number | undefined): string => (value === undefined ? '—' : value.toFixed(3));
  const header = '| arm | accuracy | macroF1 | personF1 | orgF1 | person→org | org→person | deferred | p50 ms |';
  const rule = '| --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  const lines = rows.map((row) => {
    const confusion = row.confusion as Record<string, number>;
    return `| ${row.arm} | ${cell(row.accuracy)} | ${cell(row.macroF1)} | ${cell(row.personF1)} | ${cell(row.orgF1)} | ${confusion.personAsOrg} | ${confusion.orgAsPerson} | ${row.deferred === undefined ? '—' : (row.deferred * 100).toFixed(0) + '%'} | ${row.latencyP50 === undefined ? '—' : row.latencyP50} |`;
  });

  // Best arm by macroF1 (fair under class imbalance); the heuristic is the free foreground baseline.
  const best = [...rows].sort((left, right) => right.macroF1 - left.macroF1)[0];
  const heuristicRow = rows.find((row) => row.arm === 'heuristic');
  const summary = [
    `Gold set: ${goldSize} labelled senders; scored ${scored}.`,
    `Best arm (macroF1): **${best.arm}** — macroF1 ${best.macroF1.toFixed(3)}, accuracy ${best.accuracy.toFixed(3)}.`,
    heuristicRow
      ? `Heuristic baseline (free, foreground): macroF1 ${heuristicRow.macroF1.toFixed(3)}, accuracy ${heuristicRow.accuracy.toFixed(3)}.`
      : '',
    'Watch `person→org` (real people whose replies would be suppressed) over `org→person` (wasted draft budget).',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { title: 'Summary', body: summary },
    { title: 'Per-arm scores', body: [header, rule, ...lines].join('\n') },
  ];
};
