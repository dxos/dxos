//
// Copyright 2026 DXOS.org
//

// Rule discovery, glob/grep matching against the changed set, and grouping for
// subagents.

import { globSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { git } from './git.mjs';
import { loadRule, RULE_SUFFIX } from './rule.mjs';

const toPosix = (path) => path.split(sep).join('/');

/**
 * Discover `.rule.md` files tracked or untracked-but-not-ignored, so `.gitignore`
 * is honored and freshly added rules are still picked up.
 */
export const discoverRules = (root) => {
  const glob = `*${RULE_SUFFIX}`;
  const tracked = git(['ls-files', glob], { allowFail: true }) ?? '';
  const untracked = git(['ls-files', '--others', '--exclude-standard', glob], { allowFail: true }) ?? '';
  const paths = new Set(
    [...tracked.split(/\r?\n/), ...untracked.split(/\r?\n/)].map((line) => line.trim()).filter(Boolean),
  );
  return [...paths].sort().map((relPath) => loadRule(resolve(root, relPath)));
};

/** Compile a grep pattern as a RegExp, falling back to a literal match. */
const compileGrep = (pattern) => {
  try {
    return new RegExp(pattern);
  } catch {
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
};

/**
 * Resolve a rule's globs against the working tree, keep only changed files, then
 * apply the optional `grep` pre-filter.
 *
 * @returns {string[]} Sorted, repo-relative paths this rule should review.
 */
export const matchRuleFiles = (rule, root, changedSet) => {
  const base = rule.scope === 'repo' ? root : rule.dir;
  const matched = new Set();
  for (const pattern of rule.files) {
    for (const hit of globSync(pattern, { cwd: base })) {
      matched.add(toPosix(relative(root, resolve(base, hit))));
    }
  }

  let files = [...matched].filter((path) => changedSet.has(path));

  if (rule.grep) {
    const regex = compileGrep(rule.grep);
    files = files.filter((path) => {
      try {
        return regex.test(readFileSync(join(root, path), 'utf8'));
      } catch {
        return false;
      }
    });
  }

  return files.sort();
};

/**
 * Group matched rules for subagents, favoring focus over packing: one group is a
 * single rule over a bounded chunk of its files. Rules are never merged together.
 *
 * @returns {Array<{ n: number, rule: object, files: string[] }>}
 */
export const groupRuleMatches = (ruleMatches, chunkSize) => {
  const groups = [];
  let n = 0;
  for (const { rule, files } of ruleMatches) {
    for (let start = 0; start < files.length; start += chunkSize) {
      n++;
      groups.push({ n, rule, files: files.slice(start, start + chunkSize) });
    }
  }
  return groups;
};
