//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { execFile } from 'node:child_process';
import { mkdir, readdir, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import type * as Protocol from '../agents/Protocol.ts';

const GIT_TIMEOUT_MS = 60_000;

/** A key names one worktree directory; nothing in it may climb out of the root. */
const KEY = /^[A-Za-z0-9_-]{1,128}$/;

/** A refusal the page can act on, as opposed to a fault in the helper. */
export class WorktreeError extends Error {
  constructor(
    readonly status: 400 | 409,
    message: string,
  ) {
    super(message);
  }
}

/** Where worktrees live, and the directories `git` is looked up in. */
export type Context = { root: string; path: readonly string[] };

const run = (
  { path }: Context,
  args: readonly string[],
  cwd?: string,
): Promise<{ ok: boolean; stdout: string; stderr: string }> =>
  new Promise((done) => {
    execFile(
      'git',
      [...args],
      { cwd, timeout: GIT_TIMEOUT_MS, env: { ...process.env, PATH: path.join(':') } },
      (error, stdout, stderr) => done({ ok: !error, stdout: stdout.trim(), stderr: stderr.trim() }),
    );
  });

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

/**
 * The worktree `key` names, on `branch` of `repository`: the existing one if it is already there,
 * else a new one, branching from the repository's current HEAD unless the branch already exists. The
 * path returned is where `repository` sits within it, so a folder inside a repository maps to the
 * same folder in the worktree. A folder that is not a git repository cannot have worktrees, so it is
 * its own workspace (no branch).
 */
export const ensure = async (
  context: Context,
  { repository, key, branch }: Protocol.WorktreeRequest,
): Promise<Protocol.Worktree> => {
  const git = (args: readonly string[], cwd?: string) => run(context, args, cwd);
  if (!KEY.test(key)) {
    throw new WorktreeError(400, 'invalid worktree key');
  }
  if (!isAbsolute(repository) || !(await exists(repository))) {
    throw new WorktreeError(400, 'the repository folder does not exist');
  }
  const top = await git(['rev-parse', '--show-toplevel'], repository);
  if (!top.ok) {
    return { key, path: repository, branch: '' };
  }
  const subdir = relative(top.stdout, await realpath(repository));
  const within = (path: string) => (subdir.startsWith('..') ? path : join(path, subdir));

  const path = join(context.root, key);
  if (await exists(path)) {
    const existing = await describe(context, key, path);
    return { ...existing, path: within(path) };
  }
  const checked = await git(['check-ref-format', '--branch', branch]);
  if (!checked.ok || checked.stdout !== branch) {
    throw new WorktreeError(400, 'invalid branch name');
  }

  await mkdir(context.root, { recursive: true });
  const known = await git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], top.stdout);
  const added = await git(
    known.ok ? ['worktree', 'add', path, branch] : ['worktree', 'add', '-b', branch, path],
    top.stdout,
  );
  if (!added.ok) {
    throw new WorktreeError(409, added.stderr || 'git worktree add failed');
  }
  return { key, path: within(path), branch };
};

/**
 * Removes the worktree `key` names and keeps its branch. One with uncommitted changes is kept: the
 * work in it exists nowhere else.
 */
export const remove = async (context: Context, key: string): Promise<Protocol.WorktreeOutcome> => {
  const git = (args: readonly string[], cwd?: string) => run(context, args, cwd);
  if (!KEY.test(key)) {
    throw new WorktreeError(400, 'invalid worktree key');
  }
  const path = join(context.root, key);
  if (!(await exists(path))) {
    return 'missing';
  }
  const status = await git(['status', '--porcelain'], path);
  if (!status.ok) {
    throw new WorktreeError(409, status.stderr || 'git status failed');
  }
  if (status.stdout.length > 0) {
    return 'dirty';
  }
  // Run from the repository rather than from inside the worktree being removed.
  const common = await git(['rev-parse', '--path-format=absolute', '--git-common-dir'], path);
  if (!common.ok) {
    throw new WorktreeError(409, common.stderr || 'git rev-parse failed');
  }
  const removed = await git(['--git-dir', common.stdout, 'worktree', 'remove', path]);
  if (!removed.ok) {
    throw new WorktreeError(409, removed.stderr || 'git worktree remove failed');
  }
  return 'removed';
};

/** Every worktree under `root`. */
export const list = async (context: Context): Promise<Protocol.Worktree[]> => {
  const entries = await readdir(context.root, { withFileTypes: true }).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  });
  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && KEY.test(entry.name))
      .map((entry) => describe(context, entry.name, resolve(context.root, entry.name))),
  );
};

const describe = async (context: Context, key: string, path: string): Promise<Protocol.Worktree> => {
  const head = await run(context, ['rev-parse', '--abbrev-ref', 'HEAD'], path);
  return { key, path, branch: head.ok ? head.stdout : '' };
};
