#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Calibrate the System One checker against the mined dataset. Every rule cites the review
// comments it was mined from, and each comment carries the diff hunk its reviewer flagged, so
// those hunks are labelled positives for that rule. A hunk cited by an unrelated rule is a
// presumed negative. Each hunk is sent once with every rule's verdict question, and the report
// compares each rule's scores on its own hunks with its scores on the rest.
//
// Usage: NODE_USE_ENV_PROXY=1 node calibrate.mjs [--out=CALIBRATION.md]   (needs TYPESAFE_API_KEY)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { discoverRules } from '../../../skills/agentic-review/lib/discover.mjs';
import { repoRoot } from '../../../skills/agentic-review/lib/git.mjs';
import { estimateTokens, packQuestions } from '../../../skills/agentic-review/lib/system-one/budget.mjs';
import { makeClient } from '../../../skills/agentic-review/lib/system-one/client.mjs';
import { verdictQuestion } from '../../../skills/agentic-review/lib/system-one/questions.mjs';

const { values } = parseArgs({ options: { out: { type: 'string', default: 'CALIBRATION.md' } } });
const here = dirname(fileURLToPath(import.meta.url));
const THRESHOLDS = [0.5, 0.7, 0.8];
const TRIAGE_BOUNDS = [0.15, 0.2, 0.3, 0.4];

// Cluster sections carry their example comment URLs; a rule's `Source:` line names one of them.
const clusterExamples = [];
for (const name of readdirSync(join(here, 'clusters'))) {
  for (const section of readFileSync(join(here, 'clusters', name), 'utf8').split(/\n(?=## \d+\.)/)) {
    const urls = section.match(/^- examples:(.*)$/m)?.[1].match(/https:\/\/github\.com\/\S+?discussion_r\d+/g);
    if (urls) {
      clusterExamples.push(urls);
    }
  }
}
const comments = new Map();
for (const name of readdirSync(join(here, 'chunks'))) {
  for (const line of readFileSync(join(here, 'chunks', name), 'utf8')
    .split('\n')
    .filter(Boolean)) {
    const comment = JSON.parse(line);
    comments.set(comment.url, comment);
  }
}

const rules = discoverRules(repoRoot()).filter((rule) => rule.systemOne && rule.unit === 'file');
const positives = new Map();
for (const rule of rules) {
  const source = rule.instructions.match(/https:\/\/github\.com\/\S+?discussion_r\d+/)?.[0];
  const urls = clusterExamples.find((examples) => examples.includes(source)) ?? (source ? [source] : []);
  const hunks = urls.map((url) => comments.get(url)).filter((comment) => comment?.diff_hunk);
  if (hunks.length > 0) {
    positives.set(rule.id, hunks);
  }
}
const hunks = new Map();
for (const [ruleId, list] of positives) {
  for (const comment of list) {
    const entry = hunks.get(comment.url) ?? { comment, rules: new Set() };
    entry.rules.add(ruleId);
    hunks.set(comment.url, entry);
  }
}
const calibrated = rules.filter((rule) => positives.has(rule.id));
console.error(`calibrate: ${calibrated.length} rules with cited hunks, ${hunks.size} distinct hunks`);

const client = makeClient({ apiKey: process.env.TYPESAFE_API_KEY, concurrency: 8 });
const scores = new Map(calibrated.map((rule) => [rule.id, { own: [], other: [] }]));
let inputTokens = 0;
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
      inputTokens += response.usage?.input_tokens ?? 0;
      for (const entry of batch) {
        const probability = response.answers?.[entry.id]?.noul;
        if (probability !== undefined) {
          scores.get(entry.rule.id)[own.has(entry.rule.id) ? 'own' : 'other'].push(probability);
        }
      }
    }
  }),
);

const mean = (list) => (list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : NaN);
const rate = (list, threshold) => (list.length ? list.filter((value) => value >= threshold).length / list.length : NaN);
const pct = (value) => (Number.isNaN(value) ? 'n/a' : `${Math.round(value * 100)}%`);
const rows = calibrated
  .map((rule) => ({ rule, ...scores.get(rule.id) }))
  .map((row) => ({ ...row, separation: mean(row.own) - mean(row.other) }))
  .sort((left, right) => right.separation - left.separation);
const all = { own: rows.flatMap((row) => row.own), other: rows.flatMap((row) => row.other) };

const report = [
  '# System One calibration',
  '',
  `Each rule's verdict question was asked of every diff hunk cited by any rule: ${hunks.size} hunks, ${calibrated.length} rules, $${((inputTokens / 1_000_000) * 0.042).toFixed(3)} in input tokens.`,
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
writeFileSync(join(here, values.out), report.join('\n'));
writeFileSync(
  join(here, values.out.replace(/\.md$/, '.json')),
  `${JSON.stringify(Object.fromEntries(rows.map(({ rule, own, other }) => [rule.id, { own, other }])), null, 1)}\n`,
);
console.log(report.slice(0, 20).join('\n'));
