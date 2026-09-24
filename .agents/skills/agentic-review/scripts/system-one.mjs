#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Review with TypeSafe System One instead of (or before) LLM subagents: a decision model that
// answers typed questions about a state, far cheaper than an agent but unable to explore. Each
// rule's `context` field says what to show beside the code; the model can ask for one more kind
// of context in a second round when its first verdict is uncertain.
//
// Usage:
//   node system-one.mjs [--slug=<slug> | --dir=<store>]   fill a prepared review's fragments
//   node system-one.mjs --file=<path> [--file=…] [--rule=<id> …]   probe files, print verdicts
//
// Options: --base=<ref> (diff base for context; default the review's base, or the merge-base
// with origin/main for a full-project review), --threshold=0.8, --uncertain=0.15, --lift=0.15,
// --need=0.35, --chunk=15 (files per follow-up batch),
// --rounds=2, --model=jev-latest, --concurrency=16, --dry-run (plan and price, no API calls),
// --json (probe mode: print raw verdicts).
//
// Needs TYPESAFE_API_KEY. In store mode it appends diagnostics to groups/NN.md, then writes
// SYSTEM-ONE.md (what still needs an agentic reviewer) and system-one.json (every verdict), so
// `finalize.mjs` runs unchanged afterwards.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

// Node's fetch ignores HTTPS_PROXY unless told at startup, so re-exec once with it switched on.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, ['--disable-warning=UNDICI-EHPA', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
  });
  process.exit(child.status ?? 1);
}

const { discoverRules, listRepoFiles, matchRuleFiles } = await import('../lib/discover.mjs');
const { mainMergeBase, repoRoot } = await import('../lib/git.mjs');
const { assertSafeSlug, FULL_BASE, GROUPS_MANIFEST, REVIEWS_DIR, readReview } = await import('../lib/store.mjs');
const { makeClient, DEFAULT_MODEL } = await import('../lib/system-one/client.mjs');
const { classify, DEFAULTS, diagnosticBody, diagnosticLine, runReview, uncertainBounds } =
  await import('../lib/system-one/checker.mjs');

const { values } = parseArgs({
  options: {
    'slug': { type: 'string' },
    'dir': { type: 'string' },
    'file': { type: 'string', multiple: true },
    'rule': { type: 'string', multiple: true },
    'base': { type: 'string' },
    'threshold': { type: 'string', default: String(DEFAULTS.threshold) },
    'uncertain': { type: 'string', default: String(DEFAULTS.uncertain) },
    'lift': { type: 'string', default: String(DEFAULTS.lift) },
    'need': { type: 'string', default: String(DEFAULTS.need) },
    'rounds': { type: 'string', default: '2' },
    'model': { type: 'string', default: DEFAULT_MODEL },
    'concurrency': { type: 'string', default: '16' },
    'dry-run': { type: 'boolean', default: false },
    'json': { type: 'boolean', default: false },
    'chunk': { type: 'string', default: '15' },
  },
});

const root = repoRoot();
const settings = {
  threshold: Number(values.threshold),
  uncertain: Number(values.uncertain),
  lift: Number(values.lift),
  minSample: DEFAULTS.minSample,
  need: Number(values.need),
  rounds: Number.parseInt(values.rounds, 10),
};
const chunkSize = Math.max(1, Number.parseInt(values.chunk, 10) || 15);
const log = (message) => console.error(`system-one: ${message}`);
const client = values['dry-run']
  ? null
  : makeClient({
      apiKey: process.env.TYPESAFE_API_KEY,
      model: values.model,
      concurrency: Number.parseInt(values.concurrency, 10),
    });
const rulesById = new Map(discoverRules(root).map((rule) => [rule.id, rule]));

/** A review with a prepared, not-yet-finalized store, as the default target. */
const resolveStore = () => {
  if (values.dir) {
    return values.dir;
  }
  const reviews = join(root, REVIEWS_DIR);
  if (values.slug) {
    return join(reviews, assertSafeSlug(values.slug));
  }
  const pending = existsSync(reviews)
    ? readdirSync(reviews, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(reviews, entry.name, GROUPS_MANIFEST)))
        .map((entry) => join(reviews, entry.name))
        .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)
    : [];
  if (pending.length === 0) {
    throw new Error('no prepared review to fill: run prepare.mjs first, or pass --file to probe');
  }
  return pending[0];
};

/** Split rule/file pairs into per-file targets and per-rule change-set targets. */
const buildTargets = (pairs) => {
  const fileTargets = new Map();
  const prTargets = new Map();
  for (const { rule, file } of pairs) {
    if (rule.unit === 'pr') {
      const target = prTargets.get(rule.id) ?? { rule, files: [] };
      target.files.push(file);
      prTargets.set(rule.id, target);
    } else {
      const target = fileTargets.get(file) ?? { file, rules: [] };
      target.rules.push(rule);
      fileTargets.set(file, target);
    }
  }
  return { fileTargets: [...fileTargets.values()], prTargets: [...prTargets.values()] };
};

const summarizeStats = (stats) =>
  [
    `requests: ${stats.requests}${stats.contextRetries ? ` (${stats.contextRetries} verdicts re-asked with context the model requested)` : ''}`,
    `estimated input tokens: ${stats.estimatedTokens}`,
    ...(client
      ? [
          `billed input tokens: ${stats.inputTokens} (cost $${stats.costUsd.toFixed(4)})`,
          `measured chars per token: ${stats.charsPerTokenMeasured?.toFixed(2) ?? 'n/a'}`,
        ]
      : [`estimated cost: $${((stats.estimatedTokens / 1_000_000) * 0.042).toFixed(4)}`]),
  ].join('\n');

const reviewBase = (declared) => values.base ?? (declared && declared !== FULL_BASE ? declared : mainMergeBase());

if (values.file?.length) {
  // Probe mode: judge named files against named rules (or every rule whose globs match them).
  const files = values.file.map((file) => relative(root, join(process.cwd(), file)));
  const projectFiles = listRepoFiles();
  const selected = values.rule?.length
    ? values.rule.map(
        (id) =>
          rulesById.get(id) ??
          (() => {
            throw new Error(`unknown rule ${id}`);
          })(),
      )
    : [...rulesById.values()];
  const pairs = [];
  for (const rule of selected.filter((candidate) => candidate.systemOne)) {
    const matched = values.rule?.length
      ? files
      : matchRuleFiles(rule, root, { changedSet: new Set(files), projectFiles });
    pairs.push(...matched.map((file) => ({ rule, file })));
  }
  const base = reviewBase(null);
  const result = await runReview({ client, root, base, ...buildTargets(pairs), settings, log });
  if (values.json) {
    console.log(
      JSON.stringify(
        result.verdicts.map(({ rule, ...verdict }) => ({ rule: rule.id, ...verdict })),
        null,
        2,
      ),
    );
  } else {
    const bounds = uncertainBounds(result.verdicts, settings);
    for (const verdict of result.verdicts.sort((left, right) => (right.probability ?? 0) - (left.probability ?? 0))) {
      const status = classify(verdict, settings, bounds);
      const where = verdict.where?.start ? `:${verdict.where.start}` : '';
      const need =
        verdict.need && verdict.need.kind !== 'none'
          ? ` wants ${verdict.need.kind} (${verdict.need.probability.toFixed(2)})`
          : '';
      console.log(
        `${status.padEnd(10)} ${(verdict.probability ?? NaN).toFixed(2)} r${verdict.round} ${verdict.rule.id}  ${verdict.file}${where}${need}`,
      );
    }
    console.log(`\n${summarizeStats(result.stats)}`);
  }
} else {
  // Store mode: fill a prepared review's fragments, leaving what System One cannot judge.
  const store = resolveStore();
  const review = readReview(join(store, 'REVIEW.md'));
  const manifest = JSON.parse(readFileSync(join(store, GROUPS_MANIFEST), 'utf8'));
  const base = reviewBase(review?.data?.base);
  const pairs = [];
  const skipped = [];
  for (const [nn, group] of Object.entries(manifest)) {
    const rule = rulesById.get(group.ruleId);
    if (!group.files) {
      throw new Error(`${GROUPS_MANIFEST} has no file lists: re-run prepare.mjs with this version of the harness`);
    }
    if (!rule?.systemOne) {
      skipped.push({
        nn,
        ruleId: group.ruleId,
        files: group.files,
        reason: rule ? 'system-one: off' : 'rule not found',
      });
      continue;
    }
    pairs.push(...group.files.map((file) => ({ rule, file, nn })));
  }
  const result = await runReview({ client, root, base, ...buildTargets(pairs), settings, log });

  const groupOf = (ruleId, file) =>
    Object.entries(manifest).find(([, group]) => group.ruleId === ruleId && group.files.includes(file))?.[0];
  const counts = { violation: 0, uncertain: 0, clean: 0, unanswered: 0 };
  const uncertain = new Map();
  const bounds = uncertainBounds(result.verdicts, settings);
  if (client) {
    for (const verdict of result.verdicts) {
      const status = classify(verdict, settings, bounds);
      counts[status]++;
      const nn = groupOf(verdict.rule.id, verdict.file);
      if (!nn) {
        continue;
      }
      if (status === 'violation') {
        const header = `# ${verdict.rule.severity.toUpperCase()} \`${verdict.file}:${diagnosticLine(verdict, { base })}\``;
        appendFileSync(join(store, 'groups', `${nn}.md`), `\n${header}\n\n${diagnosticBody(verdict)}\n`);
      } else if (status === 'uncertain' || status === 'unanswered') {
        // Keyed by rule, not group: a follow-up reviewer judges one rule over files from many groups.
        const entry = uncertain.get(verdict.rule.id) ?? { nn, files: [] };
        entry.files.push(`\`${verdict.file}\` (p=${verdict.probability?.toFixed(2) ?? 'n/a'})`);
        uncertain.set(verdict.rule.id, entry);
      }
    }
    writeFileSync(
      join(store, 'system-one.json'),
      `${JSON.stringify(
        result.verdicts.map(({ rule, files, ...verdict }) => ({
          rule: rule.id,
          status: classify({ rule, ...verdict }, settings, bounds),
          ...verdict,
        })),
        null,
        2,
      )}\n`,
    );
  }
  // Uncertain pairs regrouped into fresh batches per rule, each pointed at one of that rule's
  // fragments: finalize merges every fragment and stamps severity by rule, so any of them will do.
  const followUps = [...uncertain].flatMap(([ruleId, { nn, files }]) => {
    const batches = [];
    for (let start = 0; start < files.length; start += chunkSize) {
      batches.push({ ruleId, nn, files: files.slice(start, start + chunkSize) });
    }
    return batches;
  });
  const skippedByRule = new Map();
  for (const { nn, ruleId, reason } of skipped) {
    const entry = skippedByRule.get(ruleId) ?? { reason, groups: [] };
    entry.groups.push(nn);
    skippedByRule.set(ruleId, entry);
  }
  const report = [
    `# System One pass — ${relative(root, store)}`,
    '',
    `- model: ${values.model}${client ? '' : ' (dry run: nothing was sent)'}`,
    `- base for context: \`${base ?? 'none'}\``,
    `- thresholds: violation ≥ ${settings.threshold}; uncertain ≥ ${settings.uncertain} and ≥ the rule's median across this run + ${settings.lift} (rules with ${settings.minSample}+ verdicts); context fetched when asked with ≥ ${settings.need}`,
    `- verdicts: ${counts.violation} violations written to fragments, ${counts.uncertain} uncertain, ${counts.clean} clean, ${counts.unanswered} unanswered`,
    '',
    '```text',
    summarizeStats(result.stats),
    '```',
    '',
    '## Still needs an agentic reviewer',
    '',
    `Spawn one subagent per line below (${followUps.length + skipped.length} in all); every other group is already judged. A follow-up reviews only its listed files against its one rule and appends diagnostics to the named fragment.`,
    '',
    ...[...skippedByRule].map(
      ([ruleId, { reason, groups }]) =>
        `- \`${ruleId}\` (${reason}): review groups ${groups.join(', ')} as staged in STAGING.md`,
    ),
    ...followUps.map(
      ({ ruleId, nn, files }) => `- \`${ruleId}\` (uncertain) → append to \`groups/${nn}.md\`: ${files.join(', ')}`,
    ),
    ...result.oversized.map(
      ({ ruleId, file }) => `- \`${ruleId}\` on \`${file}\`: question too large beside its state`,
    ),
    '',
  ];
  writeFileSync(join(store, 'SYSTEM-ONE.md'), report.join('\n'));
  console.log(report.join('\n'));
}
