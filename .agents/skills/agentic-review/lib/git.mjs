//
// Copyright 2026 DXOS.org
//

// Thin wrappers over git for the review harness. All paths are repo-relative,
// forward-slashed, so they compare and glob-match consistently across platforms.

import { execFileSync } from 'node:child_process';

// All git calls run with cwd pinned to the repo root, so ls-files/diff outputs
// are repo-root-relative regardless of where the script was invoked from.
let cachedRoot = null;
const resolveRoot = () => {
  if (cachedRoot == null) {
    cachedRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  }
  return cachedRoot;
};

/** Run git and return trimmed stdout; throws on non-zero exit unless `allowFail`. */
export const git = (args, { allowFail = false } = {}) => {
  try {
    // Pipe stderr so a tolerated failure (allowFail) does not leak git's fatal
    // messages to the console.
    return execFileSync('git', args, {
      cwd: resolveRoot(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch (err) {
    if (allowFail) {
      return null;
    }
    throw new Error(`git ${args.join(' ')} failed: ${err.stderr ?? err.message}`);
  }
};

/** Resolve the merge-base of HEAD with the first main-like ref that exists. */
export const mainMergeBase = (candidates = ['origin/main', 'main', 'origin/master', 'master']) => {
  for (const ref of candidates) {
    const base = mergeBase('HEAD', ref);
    if (base) {
      return base;
    }
  }
  return null;
};

export const repoRoot = () => resolveRoot();

export const headCommit = () => git(['rev-parse', 'HEAD']);

export const shortSha = (commit) => git(['rev-parse', '--short', commit]);

export const currentBranch = () => git(['rev-parse', '--abbrev-ref', 'HEAD']);

/** Committer timestamp (unix seconds) for a commit, or 0 if unknown. */
export const commitTimestamp = (commit) => {
  const out = git(['show', '-s', '--format=%ct', commit], { allowFail: true });
  return out ? Number.parseInt(out, 10) : 0;
};

/** True if `ancestor` is an ancestor of (or equal to) `descendant`. */
export const isAncestor = (ancestor, descendant) => {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/** Best-effort merge-base of two refs; null if either is unknown. */
export const mergeBase = (a, b) => git(['merge-base', a, b], { allowFail: true });

/**
 * Repo-relative paths changed between `base` and the working tree: committed
 * diff `base..HEAD`, plus staged, unstaged, and untracked changes.
 */
export const changedFiles = (base) => {
  const paths = new Set();
  const collect = (out) => {
    if (!out) {
      return;
    }
    for (const line of out.split(/\r?\n/)) {
      const path = line.trim();
      if (path) {
        paths.add(path);
      }
    }
  };
  collect(git(['diff', '--name-only', `${base}..HEAD`], { allowFail: true }));
  collect(git(['diff', '--name-only', 'HEAD'], { allowFail: true }));
  collect(git(['diff', '--name-only', '--cached'], { allowFail: true }));
  collect(git(['ls-files', '--others', '--exclude-standard'], { allowFail: true }));
  return paths;
};
