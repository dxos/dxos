#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Prepare an agentic review run: discover `rule` blocks in `.mdl` files, resolve
// the file set per rule (full project by default; diff-only with `--pr-only`),
// group for subagents, and write the review store.
//
// Usage:
//   node prepare.mjs [--chunk=15] [--max-groups=20] [--base=<ref>] [--main=origin/main]
//                    [--slug=<slug>] [--pr-only]
//
// Default: no prior finalized review → every rule scans the whole project; a
// rule never seen in a prior ancestor review also gets a full first pass.
// `--pr-only` restores diff-only mode (last review or merge-base with main).
// Groups are capped at `--max-groups` (default 20; 0 = unlimited): all matched
// files are still covered — chunk sizes grow so the file set fits the budget.
//
// Refuses a dirty working tree or an existing store for HEAD — reviews are
// keyed by commit, so stage only from a clean, not-yet-reviewed commit.
//
// Prints the STAGING.md / REVIEW.md paths, the group count, and a per-group line.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { discoverRules, groupRuleMatches, listRepoFiles, matchRuleFiles } from '../lib/discover.mjs';
import {
  changedFiles,
  commitTimestamp,
  currentBranch,
  headCommit,
  isAncestor,
  isWorkingTreeDirty,
  lastCommitTouching,
  mainMergeBase,
  repoRoot,
  shortSha,
} from '../lib/git.mjs';
import {
  assertSafeSlug,
  FULL_BASE,
  GROUPS_MANIFEST,
  REVIEWS_DIR,
  readReview,
  renderFrontmatter,
  reviewSlug,
  ruleIdsFromReviewDir,
} from '../lib/store.mjs';

const { values } = parseArgs({
  options: {
    'chunk': { type: 'string', default: '15' },
    'max-groups': { type: 'string', default: '20' },
    'base': { type: 'string' },
    'main': { type: 'string', default: 'origin/main' },
    'slug': { type: 'string' },
    'pr-only': { type: 'boolean', default: false },
  },
});

const chunkSize = Math.max(1, Number.parseInt(values.chunk, 10) || 15);
const maxGroups = Number.parseInt(values['max-groups'], 10);
const prOnly = values['pr-only'] === true;
const root = repoRoot();
const head = headCommit();
const short = shortSha(head);
const branch = currentBranch();
const slug = values.slug ? assertSafeSlug(values.slug) : reviewSlug(branch, short);
const storeDir = join(root, REVIEWS_DIR, slug);

if (isWorkingTreeDirty()) {
  console.error('prepare: working tree is dirty — commit your changes first, then stage a review.');
  process.exit(1);
}
if (existsSync(storeDir)) {
  console.error(
    `prepare: a review for this commit already exists at ${REVIEWS_DIR}/${slug}/ — commit a new change (or remove that store) before staging again.`,
  );
  process.exit(1);
}

/**
 * Scan finalized reviews whose commit is an ancestor of HEAD. Returns the
 * newest such commit (for incremental diffs) and the union of rule ids those
 * runs covered (so a brand-new rule still gets a full-project first pass).
 */
const scanPriorReviews = () => {
  const reviewsPath = join(root, REVIEWS_DIR);
  let newest = null;
  const seenRuleIds = new Set();
  if (!existsSync(reviewsPath)) {
    return { newest, seenRuleIds };
  }
  for (const entry of readdirSync(reviewsPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = join(reviewsPath, entry.name);
    const review = readReview(join(dir, 'REVIEW.md'));
    const commit = review?.data?.commit;
    if (!review || String(review.data.isFinalized) !== 'true' || !commit) {
      continue;
    }
    if (commit === head) {
      continue;
    }
    let effectiveCommit = commit;
    if (!isAncestor(commit, head)) {
      // The recorded commit can be unreachable from HEAD even for a genuinely
      // prior review: its origin branch may have been squashed/rebased into
      // main under a new SHA, or a shallow clone may never have fetched it.
      // Fall back to the commit that actually landed this review's own files
      // in HEAD's history — reachable by construction, so safe to diff from.
      const landing = lastCommitTouching(`${REVIEWS_DIR}/${entry.name}/REVIEW.md`, head);
      if (!landing || landing === head || !isAncestor(landing, head)) {
        continue;
      }
      effectiveCommit = landing;
    }
    for (const ruleId of ruleIdsFromReviewDir(dir, review)) {
      seenRuleIds.add(ruleId);
    }
    const timestamp = commitTimestamp(effectiveCommit);
    if (!newest || timestamp > newest.timestamp) {
      newest = { commit: effectiveCommit, timestamp };
    }
  }
  return { newest, seenRuleIds };
};

/** Diff base for incremental / `--pr-only` runs. */
const resolveDiffBase = (priorCommit) => {
  if (values.base) {
    return values.base;
  }
  if (priorCommit) {
    return priorCommit;
  }
  // Whole-branch PR diff: merge-base with the first main-like ref, or HEAD when
  // no main ref exists (working-tree-only review).
  const candidates = values.main ? [values.main, 'origin/main', 'main'] : undefined;
  return mainMergeBase(candidates) ?? head;
};

const { newest: prior, seenRuleIds } = scanPriorReviews();
const priorCommit = prior?.commit ?? null;
const projectFiles = listRepoFiles();

let base;
let changed = null;
if (prOnly) {
  base = resolveDiffBase(priorCommit);
  changed = new Set([...changedFiles(base)].filter((path) => projectFiles.has(path)));
} else if (priorCommit || values.base) {
  // Known rules diff since the prior (or `--base`); unseen rules still full-scan.
  base = resolveDiffBase(priorCommit);
  changed = new Set([...changedFiles(base)].filter((path) => projectFiles.has(path)));
} else {
  base = FULL_BASE;
}

const rules = discoverRules(root);
const ruleMatches = [];
for (const rule of rules) {
  const isNewRule = !seenRuleIds.has(rule.id);
  const useFull = !prOnly && (base === FULL_BASE || isNewRule);
  const files = matchRuleFiles(rule, root, {
    projectFiles,
    changedSet: useFull ? null : changed,
  });
  if (files.length === 0) {
    continue;
  }
  ruleMatches.push({ rule, files, scope: useFull ? 'full' : 'delta' });
}
const groupCap = Number.isFinite(maxGroups) ? maxGroups : 20;
const groups = groupRuleMatches(ruleMatches, chunkSize, groupCap);

// Carry per-match scope onto each chunk group for STAGING / groups.json.
const scopeByRuleId = new Map(ruleMatches.map(({ rule, scope }) => [rule.id, scope]));
for (const group of groups) {
  group.scope = scopeByRuleId.get(group.rule.id) ?? 'delta';
}
// When every rule in the run is a full-project first pass, record base as `full`
// even if a prior review exists (its commit is irrelevant to this file set).
if (!prOnly && ruleMatches.length > 0 && ruleMatches.every(({ scope }) => scope === 'full')) {
  base = FULL_BASE;
}

const groupsDir = join(storeDir, 'groups');
mkdirSync(groupsDir, { recursive: true });

const modeLabel = prOnly ? 'pr-only' : 'default';
const totalFiles = groups.reduce((sum, group) => sum + group.files.length, 0);
const staging = [
  `# Review staging — ${slug}`,
  '',
  `- base: \`${base}\``,
  `- head: \`${head}\``,
  `- mode: ${modeLabel}`,
  `- groups: ${groups.length}${groupCap > 0 ? ` (max ${groupCap})` : ''}`,
  `- files: ${totalFiles}`,
  '',
  'Each group below is one rule over a bounded set of files. A subagent',
  'reviews its files against the rule and appends diagnostics to the named fragment.',
  '',
];
const manifest = {};
const appliedRuleIds = [...new Set(groups.map((group) => group.rule.id))].sort();
for (const group of groups) {
  const nn = String(group.n).padStart(2, '0');
  manifest[nn] = {
    ruleId: group.rule.id,
    severity: group.rule.severity,
    title: group.rule.title,
    scope: group.scope,
  };
  const scopeLine =
    group.scope === 'full'
      ? '**Scope:** full project (first pass for this rule)'
      : `**Scope:** changed since \`${base}\``;
  staging.push(
    `## Group ${nn} — ${group.rule.title} (\`${group.rule.id}\`, severity: ${group.rule.severity})`,
    '',
    `<!-- fragment: groups/${nn}.md -->`,
    '',
    scopeLine,
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
writeFileSync(join(storeDir, GROUPS_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);

const reviewFrontmatter = renderFrontmatter({
  branch,
  commit: head,
  base,
  mode: modeLabel,
  createdAt: new Date().toISOString(),
  isFinalized: false,
  groups: groups.length,
  rules: appliedRuleIds,
});
writeFileSync(join(storeDir, 'REVIEW.md'), `${reviewFrontmatter}\n<!-- diagnostics merged here at finalize -->\n`);

const rel = (path) => path.slice(root.length + 1);
console.log(`STAGING: ${rel(join(storeDir, 'STAGING.md'))}`);
console.log(`REVIEW:  ${rel(join(storeDir, 'REVIEW.md'))}`);
console.log(`base:    ${base}`);
console.log(`mode:    ${modeLabel}`);
console.log(`groups:  ${groups.length}${groupCap > 0 ? ` (max ${groupCap})` : ''}`);
console.log(`files:   ${totalFiles}`);
for (const group of groups) {
  console.log(
    `  ${String(group.n).padStart(2, '0')}  ${group.rule.id}  (${group.files.length} file${group.files.length === 1 ? '' : 's'}, ${group.scope})`,
  );
}
if (groups.length === 0) {
  console.log(
    prOnly ? '  (no rules matched the changed set — nothing to review)' : '  (no rules matched — nothing to review)',
  );
}
