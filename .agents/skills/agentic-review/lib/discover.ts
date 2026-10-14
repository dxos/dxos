//
// Copyright 2026 DXOS.org
//

// Rule discovery, glob/grep matching against the file set, and grouping for
// subagents.

import { readFileSync } from 'node:fs';
import { join, matchesGlob, relative, resolve, sep } from 'node:path';

import { git } from './git.ts';
import { loadRules, type Rule, RULE_SUFFIX } from './mdl.ts';

const toPosix = (path: string): string => path.split(sep).join('/');

/** True when a caught error is a Node.js `ENOENT` (file not found). */
const isEnoent = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';

/** Split git ls-files stdout into a set of repo-relative posix paths. */
const pathsFromGitOutput = (out: string | null | undefined): Set<string> =>
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
export const discoverRules = (root: string): Rule[] => {
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
export const listRepoFiles = (): Set<string> => {
  const tracked = git(['ls-files'], { allowFail: true });
  const untracked = git(['ls-files', '--others', '--exclude-standard'], { allowFail: true });
  return pathsFromGitOutput(`${tracked ?? ''}\n${untracked ?? ''}`);
};

/** Compile a grep pattern as a RegExp, tolerating a pattern that isn't valid
 * regex by matching it literally — a rule may reasonably write a plain string. */
const compileGrep = (pattern: string): RegExp => {
  try {
    return new RegExp(pattern);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    throw error;
  }
};

/** Options for {@link matchRuleFiles}. */
export type MatchRuleFilesOptions = {
  /** When set, keep only these paths (delta / `--pr-only`). When null/omitted, every
   * project file the globs hit is a candidate (full-project scan). */
  changedSet?: Set<string> | null;
  /** Git-visible paths; defaults to no extra filter when omitted (callers should pass
   * `listRepoFiles()`). */
  projectFiles?: Set<string> | null;
};

/**
 * Resolve a rule's globs against the working tree, restrict to `projectFiles`
 * (and optionally `changedSet` for incremental/PR mode), then apply the optional
 * `grep` pre-filter.
 *
 * @returns Sorted, repo-relative paths this rule should review.
 */
export const matchRuleFiles = (
  rule: Rule,
  root: string,
  { changedSet = null, projectFiles = null }: MatchRuleFilesOptions = {},
): string[] => {
  // Globs are matched against the git-visible file list rather than walked on disk: a filesystem
  // glob descends into pnpm's symlinked node_modules, which under Bun does not terminate.
  const base = rule.scope === 'repo' ? root : rule.dir;
  const known = projectFiles ?? listRepoFiles();
  const universe = changedSet ? [...changedSet].filter((path) => known.has(path)) : known;
  const matched = new Set<string>();
  for (const path of universe) {
    const fromBase = toPosix(relative(base, resolve(root, path)));
    // Like a filesystem glob, `*` and `**` do not reach into dot-directories unless the pattern names one.
    const dotted = fromBase.split('/').some((segment) => segment.startsWith('.'));
    const hit = rule.files.some(
      (pattern) =>
        matchesGlob(fromBase, pattern) && (!dotted || pattern.split('/').some((segment) => segment.startsWith('.'))),
    );
    if (!fromBase.startsWith('../') && hit) {
      matched.add(path);
    }
  }

  let files = [...matched];
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
        if (isEnoent(error)) {
          return false;
        }
        throw error;
      }
    });
  }

  return files.sort();
};

/** A rule paired with the files it matched, ready to be grouped for subagents. */
export type RuleMatch = { rule: Rule; files: string[] };

/** One subagent's unit of work: a single rule over a bounded chunk of its matched files. */
export type RuleGroup = { n: number; rule: Rule; files: string[]; scope?: 'full' | 'delta' };

/**
 * Group matched rules for subagents, favoring focus over packing: one group is a
 * single rule over a bounded chunk of its files. Rules are never merged together.
 *
 * When `maxGroups > 0`, every matched file is still covered — slot budget is
 * shared across rules (at least one group each) and each rule's files are split
 * evenly into its slots (chunk size grows as needed). If there are more rules
 * than `maxGroups`, the budget expands to one group per rule so files are never
 * dropped. `maxGroups <= 0` means unlimited (use `chunkSize` only).
 */
export const groupRuleMatches = (ruleMatches: RuleMatch[], chunkSize: number, maxGroups = 0): RuleGroup[] => {
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

  const groups: RuleGroup[] = [];
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
 */
export const allocateGroupSlots = (fileCounts: number[], maxGroups: number): number[] => {
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
