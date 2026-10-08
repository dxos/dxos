#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Fast PR review: Jev (TypeSafe System One) alone, no subagents. Runs prepare (`--fast`, a
// merge-aware diff of the whole PR from its merge-base with main), fills every group with System
// One, and finalizes, leaving a single REVIEW.md in `.agents/reviews/<short-sha>/` to commit. The
// PR's earlier review stores are then superseded: their `ignored` statuses carry onto matching
// rows of the new index and the old stores are deleted, so a PR keeps one review. Pairs
// System One is unsure of, and `system-one: off` rules, are counted in its appendix and not
// reviewed — that is the trade for the speed.
//
// Usage:
//   bun fast.ts [--main=origin/main] [--base=<ref>] [--dry-run]
//
// `--base` reviews only the diff from that ref, which does not cover the whole PR, so earlier
// stores are kept.
//
// Needs TYPESAFE_API_KEY (except with --dry-run) and a clean, committed working tree.

import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { headCommit, mainMergeBase, repoRoot, shortSha } from '../lib/git.ts';
import { findPrReviews } from '../lib/pr-check.ts';
import { readIndexEntries } from '../lib/review-doc.ts';
import { GROUPS_MANIFEST, REVIEWS_DIR, readReview } from '../lib/store.ts';
import { applyStatuses, carryStatuses } from '../lib/supersede.ts';

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
  console.error('fast: TYPESAFE_API_KEY is not set — export it (see the 1password skill), or pass --dry-run.');
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

const mainBase = values.base ? null : mainMergeBase(values.main ? [values.main, 'origin/main', 'main'] : undefined);
// Only a review of the whole PR can stand in for the stores before it.
const priors = mainBase ? findPrReviews(mainBase, root).filter((review) => review.slug !== slug) : [];
// Deleting a store whose index did not parse would drop its dismissals unseen.
const unreadable = priors.filter((review) => review.error);
if (unreadable.length > 0) {
  for (const review of unreadable) {
    console.error(`fast: review \`${review.slug}\` has an unreadable index: ${review.error}`);
  }
  console.error('fast: fix those index lines first, so their statuses carry into the new review.');
  process.exit(1);
}

run('prepare.ts', [
  '--fast',
  // System One reads per-group file lists, so capping groups buys nothing here.
  '--max-groups=0',
  `--slug=${slug}`,
  ...(values.main ? [`--main=${values.main}`] : []),
  // Pinning the merge-base keeps prepare from diffing against the stores this run replaces.
  ...(values.base ? [`--base=${values.base}`] : mainBase ? [`--base=${mainBase}`] : []),
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

if (priors.length > 0) {
  const reviewPath = join(store, 'REVIEW.md');
  const next = readIndexEntries(store, readReview(reviewPath)?.body ?? '');
  const statuses = carryStatuses(
    priors.flatMap((review) => review.entries),
    next,
  );
  applyStatuses(reviewPath, statuses);
  for (const review of priors) {
    rmSync(join(root, REVIEWS_DIR, review.slug), { recursive: true, force: true });
  }
  console.log(
    `\nfast: superseded ${priors.map((review) => review.slug).join(', ')}; carried ${statuses.size} ignored status(es) into ${slug}.`,
  );
}

console.log(`
Next:
  1. Fix each issue in ${REVIEWS_DIR}/${slug}/REVIEW.md, or dismiss it.
  2. Set its row in that file's \`## Index\` to \`resolved\` or \`ignored\`.
  3. Commit the store, and the deletion of any store it superseded, with your fixes. CI (Agentic
     Review) accepts the PR while less than 20% of it has changed since this review; past that,
     run this script again — it replaces this store rather than adding another.
Pairs Jev left uncertain stay unreviewed by design: do not spawn subagents for them.`);
