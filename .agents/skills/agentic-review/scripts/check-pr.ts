#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// CI gate (advisory) for PR mode: checks that this branch carries a finalized agentic review,
// that every issue it raised is resolved or ignored, and that the code has drifted no more than
// 20% (LOC since the review / LOC of the PR, merges and generated files excluded). It reads only
// committed files — the review itself is run by an author or agent, never by CI.
//
// Usage:
//   node check-pr.ts [--base=<ref>] [--main=origin/main] [--limit=0.2]
//
// `--base` is the PR's target (CI passes the base SHA); the merge-base with HEAD is used either
// way. Runs under Node's type stripping or Bun alike, so CI needs no install. Writes the report to
// `$GITHUB_STEP_SUMMARY` when set, and exits 1 when the PR needs attention.

import { appendFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { git, mainMergeBase, repoRoot } from '../lib/git.ts';
import { DRIFT_LIMIT, checkPr, renderPrCheck } from '../lib/pr-check.ts';

const { values } = parseArgs({
  options: {
    base: { type: 'string' },
    main: { type: 'string', default: 'origin/main' },
    limit: { type: 'string', default: String(DRIFT_LIMIT) },
  },
});

const root = repoRoot();
const base = values.base
  ? git(['merge-base', 'HEAD', values.base], { cwd: root })
  : mainMergeBase([values.main ?? 'origin/main', 'origin/main', 'main']);
if (!base) {
  console.error('check-pr: cannot resolve a merge-base with the target branch; pass --base=<ref>.');
  process.exit(2);
}

const check = checkPr({ base, root, limit: Number(values.limit) });
const report = renderPrCheck(check);
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
}
if (!check.ok) {
  for (const problem of check.problems) {
    console.log(`::warning title=Agentic review::${problem.replaceAll('\n', ' ')}`);
  }
  process.exit(1);
}
