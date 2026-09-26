//
// Copyright 2026 DXOS.org
//

// Thin wrappers over git for the review harness. All paths are repo-relative,
// forward-slashed, so they compare and glob-match consistently across platforms.

import { execFileSync } from 'node:child_process';

// All git calls run with cwd pinned to the repo root, so ls-files/diff outputs
// are repo-root-relative regardless of where the script was invoked from.
let cachedRoot: string | null = null;
const resolveRoot = (): string => {
  if (cachedRoot == null) {
    cachedRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  }
  return cachedRoot;
};

/** Options for {@link git}; `cwd` overrides the repo root (tests run against a scratch repo). */
export type GitOptions = { allowFail?: boolean; cwd?: string; input?: string };

/** Narrow shape of the error `execFileSync` throws, enough to read its captured stderr. */
type ExecError = { stderr?: unknown; message: string };

const isExecError = (error: unknown): error is ExecError =>
  typeof error === 'object' && error !== null && 'message' in error;

/** Run git and return trimmed stdout; throws on non-zero exit unless `allowFail`. */
export function git(args: string[], options?: { allowFail?: false; cwd?: string; input?: string }): string;
export function git(args: string[], options: { allowFail: true; cwd?: string; input?: string }): string | null;
export function git(args: string[], { allowFail = false, cwd, input }: GitOptions = {}): string | null {
  try {
    // Pipe stderr so a tolerated failure (allowFail) does not leak git's fatal
    // messages to the console.
    return execFileSync('git', args, {
      cwd: cwd ?? resolveRoot(),
      encoding: 'utf8',
      input,
      stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch (err) {
    if (allowFail) {
      return null;
    }
    const detail = isExecError(err) ? (err.stderr ?? err.message) : String(err);
    throw new Error(`git ${args.join(' ')} failed: ${detail}`);
  }
}

/** Resolve the merge-base of HEAD with the first main-like ref that exists. */
export const mainMergeBase = (
  candidates: string[] = ['origin/main', 'main', 'origin/master', 'master'],
  cwd?: string,
): string | null => {
  for (const ref of candidates) {
    const base = mergeBase('HEAD', ref, cwd);
    if (base) {
      return base;
    }
  }
  return null;
};

export const repoRoot = (): string => resolveRoot();

export const headCommit = (): string => git(['rev-parse', 'HEAD']);

export const shortSha = (commit: string): string => git(['rev-parse', '--short', commit]);

export const currentBranch = (): string => git(['rev-parse', '--abbrev-ref', 'HEAD']);

/**
 * True when the working tree has staged, unstaged, or untracked changes.
 * Reviews are keyed by commit, so prepare refuses to run on a dirty tree.
 */
export const isWorkingTreeDirty = (): boolean => {
  const out = git(['status', '--porcelain'], { allowFail: true });
  return Boolean(out && out.length > 0);
};

/** Committer timestamp (unix seconds) for a commit, or 0 if unknown. */
export const commitTimestamp = (commit: string, cwd?: string): number => {
  const out = git(['show', '-s', '--format=%ct', commit], { allowFail: true, cwd });
  return out ? Number.parseInt(out, 10) : 0;
};

/**
 * True if `ancestor` is an ancestor of (or equal to) `descendant`. Any nonzero
 * exit is deliberately treated as "not an ancestor" — that covers git's own
 * exit-1 answer and an `ancestor` commit absent from this clone (a persisted
 * prior review referencing an unfetched commit), both of which mean base
 * resolution should skip it rather than fail.
 */
export const isAncestor = (ancestor: string, descendant: string, cwd?: string): boolean => {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/** Best-effort merge-base of two refs; null if either is unknown. Internal — the
 * only consumer is `mainMergeBase`. */
const mergeBase = (a: string, b: string, cwd?: string): string | null =>
  git(['merge-base', a, b], { allowFail: true, cwd });

/**
 * Newest commit reachable from `ref` that touched `path`, or null if none. Used
 * as a same-history fallback when a review's recorded `commit:` no longer
 * resolves as a real ancestor — its origin branch was squashed or rebased away
 * under a new SHA (or, in a shallow clone, was simply never fetched) — even
 * though the review's own files are plainly present in `ref`'s history.
 */
export const lastCommitTouching = (path: string, ref: string = 'HEAD'): string | null => {
  const commit = git(['log', '-1', '--format=%H', ref, '--', path], { allowFail: true });
  return commit || null;
};

/** Non-empty trimmed lines of a git listing; a failed (null) listing yields none. */
const lines = (out: string | null): string[] =>
  (out ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** Staged, unstaged, and untracked paths — uncommitted work is the author's by definition. */
const workingTreeChanges = (cwd?: string): string[] => [
  ...lines(git(['diff', '--name-only', 'HEAD'], { allowFail: true, cwd })),
  ...lines(git(['diff', '--name-only', '--cached'], { allowFail: true, cwd })),
  ...lines(git(['ls-files', '--others', '--exclude-standard'], { allowFail: true, cwd })),
];

/**
 * Repo-relative paths changed between `base` and the working tree: committed
 * diff `base..HEAD`, plus staged, unstaged, and untracked changes.
 */
export const changedFiles = (base: string): Set<string> =>
  new Set([...lines(git(['diff', '--name-only', `${base}..HEAD`], { allowFail: true })), ...workingTreeChanges()]);

/**
 * Paths a PR's own commits changed since `base`, ignoring merges: a file counts only when a
 * non-merge commit on HEAD's first-parent line touched it and it still differs from `base`.
 * A merge from main, and the conflict resolution inside it, therefore adds nothing — the review
 * judges the author's change, not the main-line code it was reconciled with.
 */
export const prChangedFiles = (base: string, cwd?: string): Set<string> => {
  const touched = new Set(
    lines(
      git(['log', '--first-parent', '--no-merges', '--format=', '--name-only', `${base}..HEAD`], {
        allowFail: true,
        cwd,
      }),
    ),
  );
  const net = lines(git(['diff', '--name-only', base, 'HEAD'], { allowFail: true, cwd }));
  return new Set([...net.filter((path) => touched.has(path)), ...workingTreeChanges(cwd)]);
};
