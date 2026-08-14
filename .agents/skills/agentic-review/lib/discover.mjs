//
// Copyright 2026 DXOS.org
//

// Rule discovery, glob/grep matching against the file set, and grouping for
// subagents.

import { globSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { git } from './git.mjs';
import { loadRules, RULE_SUFFIX } from './mdl.mjs';

const toPosix = (path) => path.split(sep).join('/');

/** Split git ls-files stdout into a set of repo-relative posix paths. */
const pathsFromGitOutput = (out) =>
  new Set(
    (out ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

/**
 * Discover every `rule` block across the repo's `.mdl` files (tracked and
 * untracked-but-not-ignored, so `.gitignore` is honored and freshly added rules
 * are still picked up). Descriptor `.mdl` files with no `rule` block yield none.
 */
export const discoverRules = (root) => {
  const glob = `*${RULE_SUFFIX}`;
  const tracked = git(['ls-files', glob], { allowFail: true }) ?? '';
  const untracked = git(['ls-files', '--others', '--exclude-standard', glob], { allowFail: true }) ?? '';
  const paths = pathsFromGitOutput(`${tracked}\n${untracked}`);
  return [...paths].sort().flatMap((relPath) => loadRules(resolve(root, relPath)));
};

/**
 * Every path git considers part of the working tree: tracked files plus
 * untracked-but-not-ignored. Used as the universe for full-project rule scans so
 * globs never pull in `node_modules` or other ignored trees.
 */
export const listRepoFiles = () => {
  const tracked = git(['ls-files'], { allowFail: true });
  const untracked = git(['ls-files', '--others', '--exclude-standard'], { allowFail: true });
  return pathsFromGitOutput(`${tracked ?? ''}\n${untracked ?? ''}`);
};

/** Compile a grep pattern as a RegExp, tolerating a pattern that isn't valid
 * regex by matching it literally — a rule may reasonably write a plain string. */
const compileGrep = (pattern) => {
  try {
    return new RegExp(pattern);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    throw error;
  }
};

/**
 * Resolve a rule's globs against the working tree, restrict to `projectFiles`
 * (and optionally `changedSet` for incremental/PR mode), then apply the optional
 * `grep` pre-filter.
 *
 * @param {object} [options]
 * @param {Set<string>|null} [options.changedSet] When set, keep only these paths
 *   (delta / `--pr-only`). When null/omitted, every project file the globs hit
 *   is a candidate (full-project scan).
 * @param {Set<string>|null} [options.projectFiles] Git-visible paths; defaults to
 *   no extra filter when omitted (callers should pass `listRepoFiles()`).
 * @returns {string[]} Sorted, repo-relative paths this rule should review.
 */
export const matchRuleFiles = (rule, root, { changedSet = null, projectFiles = null } = {}) => {
  const base = rule.scope === 'repo' ? root : rule.dir;
  const matched = new Set();
  for (const pattern of rule.files) {
    for (const hit of globSync(pattern, { cwd: base })) {
      matched.add(toPosix(relative(root, resolve(base, hit))));
    }
  }

  let files = [...matched];
  if (projectFiles) {
    files = files.filter((path) => projectFiles.has(path));
  }
  if (changedSet) {
    files = files.filter((path) => changedSet.has(path));
  }

  if (rule.grep) {
    const regex = compileGrep(rule.grep);
    files = files.filter((path) => {
      try {
        return regex.test(readFileSync(join(root, path), 'utf8'));
      } catch (error) {
        // A file may vanish between the changed-set scan and this read; treat
        // only that as a non-match and surface any other read failure.
        if (error?.code === 'ENOENT') {
          return false;
        }
        throw error;
      }
    });
  }

  return files.sort();
};

/**
 * Group matched rules for subagents, favoring focus over packing: one group is a
 * single rule over a bounded chunk of its files. Rules are never merged together.
 *
 * When `maxGroups > 0`, every matched file is still covered — slot budget is
 * shared across rules (at least one group each) and each rule's files are split
 * evenly into its slots (chunk size grows as needed). If there are more rules
 * than `maxGroups`, the budget expands to one group per rule so files are never
 * dropped. `maxGroups <= 0` means unlimited (use `chunkSize` only).
 *
 * @returns {Array<{ n: number, rule: object, files: string[] }>}
 */
export const groupRuleMatches = (ruleMatches, chunkSize, maxGroups = 0) => {
  const active = ruleMatches.filter(({ files }) => files.length > 0);
  if (active.length === 0) {
    return [];
  }

  const slots =
    maxGroups > 0
      ? allocateGroupSlots(
          active.map(({ files }) => files.length),
          maxGroups,
        )
      : active.map(({ files }) => Math.ceil(files.length / chunkSize));

  const groups = [];
  let n = 0;
  for (let index = 0; index < active.length; index++) {
    const { rule, files } = active[index];
    const slotCount = Math.max(1, slots[index]);
    const size = Math.ceil(files.length / slotCount);
    for (let start = 0; start < files.length; start += size) {
      n++;
      groups.push({ n, rule, files: files.slice(start, start + size) });
    }
  }
  return groups;
};

/**
 * Split `maxGroups` across rules with file counts `fileCounts`: one slot each,
 * then give remaining slots to the rule with the highest files/slots ratio so
 * large rules get finer chunks. Never returns fewer slots than rules.
 *
 * @param {number[]} fileCounts
 * @param {number} maxGroups
 * @returns {number[]}
 */
export const allocateGroupSlots = (fileCounts, maxGroups) => {
  const count = fileCounts.length;
  const budget = Math.max(maxGroups, count);
  const slots = Array.from({ length: count }, () => 1);
  let remaining = budget - count;
  while (remaining > 0) {
    let best = 0;
    let bestRatio = -1;
    for (let index = 0; index < count; index++) {
      const ratio = fileCounts[index] / slots[index];
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = index;
      }
    }
    slots[best]++;
    remaining--;
  }
  return slots;
};
