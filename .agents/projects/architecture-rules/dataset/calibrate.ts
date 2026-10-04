#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Calibrate the System One checker against the mined dataset. Every rule cites the review
// comments it was mined from, and each comment carries the diff hunk its reviewer flagged, so
// those hunks are labelled positives for that rule. A hunk cited by an unrelated rule is a
// presumed negative. Each hunk is sent once with every rule's verdict question, and the report
// compares each rule's scores on its own hunks with its scores on the rest.
//
// Usage: bun calibrate.ts [--out=CALIBRATION.md]   (needs TYPESAFE_API_KEY)
//        bun calibrate.ts --from-json                                  (rebuild from saved scores)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { discoverRules } from '../../../skills/agentic-review/lib/discover.ts';
import { repoRoot } from '../../../skills/agentic-review/lib/git.ts';
import { estimateTokens, packQuestions } from '../../../skills/agentic-review/lib/system-one/budget.ts';
import { makeClient } from '../../../skills/agentic-review/lib/system-one/client.ts';
import { verdictQuestion } from '../../../skills/agentic-review/lib/system-one/questions.ts';
import { loadLabels, mean, median, pct, rate } from './dataset.ts';

const { values } = parseArgs({
  options: {
    'out': { type: 'string', default: 'CALIBRATION.md' },
    // Rebuild the report from the scores a previous run saved, without calling the API.
    'from-json': { type: 'boolean', default: false },
  },
});
const here = dirname(fileURLToPath(import.meta.url));
const THRESHOLDS = [0.5, 0.7, 0.8];
const TRIAGE_BOUNDS = [0.15, 0.2, 0.3, 0.4];
const RELATIVE: [number, number][] = [
  [0.15, 0.1],
  [0.15, 0.15],
  [0.15, 0.2],
];

/** A rule's own scores on the hunks it was mined from, versus its scores on every other hunk. */
type RuleScores = { own: number[]; other: number[] };

const rules = discoverRules(repoRoot()).filter((rule) => rule.systemOne && rule.unit === 'file');
const { positives, hunks } = loadLabels(here, rules);
const calibrated = rules.filter((rule) => positives.has(rule.id));
console.error(`calibrate: ${calibrated.length} rules with cited hunks, ${hunks.size} distinct hunks`);

const jsonPath = join(here, values.out.replace(/\.md$/, '.json'));
const scores = new Map<string, RuleScores>(calibrated.map((rule) => [rule.id, { own: [], other: [] }]));
let inputTokens: number | null = null;
if (values['from-json']) {
  for (const [ruleId, saved] of Object.entries(
    JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, RuleScores>,
  )) {
    if (scores.has(ruleId)) {
      scores.set(ruleId, saved);
    }
  }
} else {
  const client = makeClient({ apiKey: process.env.TYPESAFE_API_KEY, concurrency: 8 });
  inputTokens = 0;
  await Promise.all(
    [...hunks.values()].map(async ({ comment, rules: own }) => {
      const state = { file: { path: comment.path, source: comment.diff_hunk } };
      const entries = calibrated.map((rule, index) => ({ id: `r${index}`, question: verdictQuestion(rule), rule }));
      const { batches } = packQuestions(estimateTokens(state), entries);
      for (const batch of batches) {
        const response = await client.evaluate(
          state,
          Object.fromEntries(batch.map((entry) => [entry.id, entry.question])),
        );
        inputTokens = (inputTokens ?? 0) + (response.usage?.input_tokens ?? 0);
        for (const entry of batch) {
          const answer = response.answers?.[entry.id];
          const probability = answer?.type === 'noul' ? answer.noul : undefined;
          if (probability !== undefined) {
            const ruleScores = scores.get(entry.rule.id);
            ruleScores?.[own.has(entry.rule.id) ? 'own' : 'other'].push(probability);
          }
        }
      }
    }),
  );
}

const ratio = (part: number, whole: number): number => (whole ? part / whole : NaN);
const rows = calibrated
  .map((rule) => {
    const ruleScores = scores.get(rule.id) ?? { own: [], other: [] };
    return { rule, ...ruleScores };
  })
  .map((row) => ({ ...row, separation: mean(row.own) - mean(row.other) }))
  .sort((left, right) => right.separation - left.separation);
const all = { own: rows.flatMap((row) => row.own), other: rows.flatMap((row) => row.other) };

const report = [
  '# System One calibration',
  '',
  `Each rule's verdict question was asked of every diff hunk cited by any rule: ${hunks.size} hunks, ${calibrated.length} rules${inputTokens === null ? ' (report rebuilt from the saved scores)' : `, $${((inputTokens / 1_000_000) * 0.042).toFixed(3)} in input tokens`}.`,
  "A rule's own hunks are the code its source reviewers flagged. Other rules' hunks are presumed clean for it, which overstates false positives wherever one hunk breaks two rules.",
  '',
  '| Threshold | Recall on own hunks | Flag rate on other hunks |',
  '| --------- | ------------------- | ------------------------ |',
  ...THRESHOLDS.map(
    (threshold) => `| ${threshold} | ${pct(rate(all.own, threshold))} | ${pct(rate(all.other, threshold))} |`,
  ),
  '',
  '## As a triage filter',
  '',
  'Used as a first pass, a verdict under the lower bound is dismissed and everything above it goes on to an agentic reviewer. What matters is how many real findings survive and how much reviewer work is saved.',
  '',
  '| Lower bound | Own hunks kept for review | Other pairs sent to review needlessly |',
  '| ----------- | ------------------------- | ------------------------------------- |',
  ...TRIAGE_BOUNDS.map((bound) => `| ${bound} | ${pct(rate(all.own, bound))} | ${pct(rate(all.other, bound))} |`),
  '',
  "A flat bound treats every rule alike, but subjective rules score middling on almost any code. Raising each rule's bound to its own median plus a lift routes less and keeps more:",
  '',
  '| Floor | Lift over the rule median | Own hunks kept for review | Other pairs sent to review needlessly |',
  '| ----- | ------------------------- | ------------------------- | ------------------------------------- |',
  ...RELATIVE.map(([floor, lift]) => {
    const kept = (list: (row: (typeof rows)[number]) => number[]) => (row: (typeof rows)[number]) =>
      list(row).filter((value) => value >= Math.max(floor, median([...row.own, ...row.other]) + lift));
    return `| ${floor} | ${lift} | ${pct(ratio(rows.flatMap(kept((row) => row.own)).length, all.own.length))} | ${pct(ratio(rows.flatMap(kept((row) => row.other)).length, all.other.length))} |`;
  }),
  '',
  '## Per rule, by separation',
  '',
  '| Rule | Own hunks | Mean p own | Mean p other | Separation | Own ≥ 0.7 | Other ≥ 0.7 |',
  '| ---- | --------- | ---------- | ------------ | ---------- | --------- | ----------- |',
  ...rows.map(
    ({ rule, own, other, separation }) =>
      `| \`${rule.id}\` | ${own.length} | ${mean(own).toFixed(2)} | ${mean(other).toFixed(2)} | ${separation.toFixed(2)} | ${pct(rate(own, 0.7))} | ${pct(rate(other, 0.7))} |`,
  ),
  '',
];
writeFileSync(join(here, values.out ?? 'CALIBRATION.md'), report.join('\n'));
writeFileSync(
  jsonPath,
  `${JSON.stringify(Object.fromEntries(rows.map(({ rule, own, other }) => [rule.id, { own, other }])), null, 1)}\n`,
);
console.log(report.slice(0, 32).join('\n'));
