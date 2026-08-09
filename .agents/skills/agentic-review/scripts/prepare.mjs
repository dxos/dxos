#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Prepare an agentic review run: discover `.rule.md` rules, resolve the diff
// base, intersect changed files with each rule, group for subagents, and write
// the review store (STAGING.md, blank REVIEW.md, groups/NN.md stubs).
//
// Usage:
//   node prepare.mjs [--chunk=15] [--base=<ref>] [--main=origin/main] [--slug=<slug>]
//
// Prints the STAGING.md / REVIEW.md paths, the group count, and a per-group line.

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { discoverRules, groupRuleMatches, matchRuleFiles } from '../lib/discover.mjs';
import {
  changedFiles,
  commitTimestamp,
  currentBranch,
  headCommit,
  isAncestor,
  mainMergeBase,
  repoRoot,
  shortSha,
} from '../lib/git.mjs';
import { REVIEWS_DIR, readReview, renderFrontmatter, reviewSlug } from '../lib/store.mjs';

const { values } = parseArgs({
  options: {
    chunk: { type: 'string', default: '15' },
    base: { type: 'string' },
    main: { type: 'string', default: 'origin/main' },
    slug: { type: 'string' },
  },
});

const chunkSize = Math.max(1, Number.parseInt(values.chunk, 10) || 15);
const root = repoRoot();
const head = headCommit();
const short = shortSha(head);
const branch = currentBranch();

/**
 * Resolve the diff base: the newest finalized prior review whose commit is an
 * ancestor of HEAD; otherwise the merge-base with main; otherwise HEAD.
 */
const resolveBase = () => {
  if (values.base) {
    return values.base;
  }
  const reviewsPath = join(root, REVIEWS_DIR);
  let best = null;
  if (existsSync(reviewsPath)) {
    for (const entry of readdirSync(reviewsPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const review = readReview(join(reviewsPath, entry.name, 'REVIEW.md'));
      const commit = review?.data?.commit;
      if (!review || String(review.data.isFinalized) !== 'true' || !commit) {
        continue;
      }
      if (commit === head || !isAncestor(commit, head)) {
        continue;
      }
      const timestamp = commitTimestamp(commit);
      if (!best || timestamp > best.timestamp) {
        best = { commit, timestamp };
      }
    }
  }
  if (best) {
    return best.commit;
  }
  // Review the whole branch diff: merge-base with the first main-like ref, or, in
  // a detached/main-less checkout, HEAD (only the working tree is then reviewed).
  const candidates = values.main ? [values.main, 'origin/main', 'main'] : undefined;
  return mainMergeBase(candidates) ?? head;
};

const base = resolveBase();
const changed = new Set([...changedFiles(base)].filter((path) => existsSync(join(root, path))));

const rules = discoverRules(root);
const ruleMatches = rules
  .map((rule) => ({ rule, files: matchRuleFiles(rule, root, changed) }))
  .filter(({ files }) => files.length > 0);
const groups = groupRuleMatches(ruleMatches, chunkSize);

const slug = values.slug ?? reviewSlug(branch, short);
const storeDir = join(root, REVIEWS_DIR, slug);
const groupsDir = join(storeDir, 'groups');
// A re-run for the same slug replaces prior fragments so stale diagnostics never linger.
rmSync(groupsDir, { recursive: true, force: true });
mkdirSync(groupsDir, { recursive: true });

const staging = [
  `# Review staging — ${slug}`,
  '',
  `- base: \`${base}\``,
  `- head: \`${head}\``,
  `- groups: ${groups.length}`,
  '',
  'Each group below is one rule over a bounded set of changed files. A subagent',
  'reviews its files against the rule and appends diagnostics to the named fragment.',
  '',
];
for (const group of groups) {
  const nn = String(group.n).padStart(2, '0');
  staging.push(
    `## Group ${nn} — ${group.rule.title} (\`${group.rule.id}\`, severity: ${group.rule.severity})`,
    '',
    `<!-- fragment: groups/${nn}.md -->`,
    '',
    '**Rule instructions:**',
    '',
    group.rule.instructions,
    '',
    `**Files to review (${group.files.length}):**`,
    '',
    ...group.files.map((path) => `- \`${path}\``),
    '',
  );
  writeFileSync(
    join(groupsDir, `${nn}.md`),
    `<!-- Group ${nn}: ${group.rule.id}. Append diagnostics below in the header format "# WARN|ERROR \`file:line[:col]\`". Leave empty if clean. -->\n`,
  );
}
writeFileSync(join(storeDir, 'STAGING.md'), staging.join('\n'));

const reviewFrontmatter = renderFrontmatter({
  branch,
  commit: head,
  base,
  createdAt: new Date().toISOString(),
  isFinalized: false,
  groups: groups.length,
});
writeFileSync(join(storeDir, 'REVIEW.md'), `${reviewFrontmatter}\n<!-- diagnostics merged here at finalize -->\n`);

const rel = (path) => path.slice(root.length + 1);
console.log(`STAGING: ${rel(join(storeDir, 'STAGING.md'))}`);
console.log(`REVIEW:  ${rel(join(storeDir, 'REVIEW.md'))}`);
console.log(`base:    ${base}`);
console.log(`groups:  ${groups.length}`);
for (const group of groups) {
  console.log(
    `  ${String(group.n).padStart(2, '0')}  ${group.rule.id}  (${group.files.length} file${group.files.length === 1 ? '' : 's'})`,
  );
}
if (groups.length === 0) {
  console.log('  (no rules matched the changed set — nothing to review)');
}
