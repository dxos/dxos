#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Fast PR review: Jev (TypeSafe System One) alone, no subagents. Runs prepare (`--fast`, a
// merge-aware diff against this branch's last review or its merge-base with main), fills every
// group with System One, and finalizes, leaving REVIEW.md + RESOLUTION.md + SYSTEM-ONE.md in
// `.agents/reviews/<short-sha>/` to commit. Pairs System One is unsure of, and `system-one: off`
// rules, are recorded in SYSTEM-ONE.md and not reviewed — that is the trade for the speed.
//
// Usage:
//   bun fast.ts [--main=origin/main] [--base=<ref>] [--dry-run]
//
// Needs TYPESAFE_API_KEY (except with --dry-run) and a clean, committed working tree.

import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { headCommit, repoRoot, shortSha } from '../lib/git.ts';
import { GROUPS_MANIFEST, REVIEWS_DIR } from '../lib/store.ts';

const { values } = parseArgs({
  options: {
    'main': { type: 'string' },
    'base': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const root = repoRoot();
const dryRun = values['dry-run'] === true;
const slug = shortSha(headCommit());
const store = join(root, REVIEWS_DIR, slug);
const script = (name: string): string => join(import.meta.dir, name);

if (!dryRun && !process.env.TYPESAFE_API_KEY) {
  console.error('fast: TYPESAFE_API_KEY is not set — read it with `op` (see the 1password skill), or pass --dry-run.');
  process.exit(1);
}

/** Run a sibling script with this Bun, streaming its output; exit with it on failure. */
const run = (name: string, args: string[]): void => {
  const result = spawnSync(process.execPath, [script(name), ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`fast: ${name} failed (exit ${result.status ?? result.signal}).`);
    process.exit(result.status ?? 1);
  }
};

run('prepare.ts', [
  '--fast',
  // System One reads per-group file lists, so capping groups buys nothing here.
  '--max-groups=0',
  `--slug=${slug}`,
  ...(values.main ? [`--main=${values.main}`] : []),
  ...(values.base ? [`--base=${values.base}`] : []),
]);

const groups = Object.keys(JSON.parse(readFileSync(join(store, GROUPS_MANIFEST), 'utf8')));
if (groups.length > 0) {
  run('system-one.ts', [`--slug=${slug}`, ...(dryRun ? ['--dry-run'] : [])]);
}
if (dryRun) {
  // A dry run prices the pass without judging anything, so there is nothing to finalize.
  rmSync(store, { recursive: true, force: true });
  console.log('\nfast: dry run — store removed.');
  process.exit(0);
}
run('finalize.ts', [`--slug=${slug}`]);
// Per-verdict dump for tuning the checker; too large to commit on every PR.
rmSync(join(store, 'system-one.json'), { force: true });

console.log(`
Next:
  1. Fix each issue in ${REVIEWS_DIR}/${slug}/REVIEW.md, or dismiss it.
  2. Set its row in ${REVIEWS_DIR}/${slug}/RESOLUTION.md to \`resolved\` or \`ignored\`.
  3. Commit the store with your fixes. CI (Agentic Review) accepts the PR while less than 20% of
     it has changed since this review; past that, run this script again.`);
