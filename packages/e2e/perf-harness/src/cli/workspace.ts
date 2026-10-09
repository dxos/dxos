//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** A refusal the caller can act on (dirty tree, busy machine, missing build); exits with the error code. */
export class HarnessError extends Error {}

export const git = (root: string, args: ReadonlyArray<string>): string =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();

export const workspaceRoot = (cwd = process.cwd()): string => git(cwd, ['rev-parse', '--show-toplevel']);

/** Untracked by design: the per-worktree home of arms, runs and the ledger. */
export const perfDir = (root: string): string => path.join(root, '.perf');

export type Ports = { slot: number; http: number; debug: number };

/** Ports derived from the worktree path, so two worktrees on one machine never serve or attach to each other's. */
export const derivePorts = (root: string, env: NodeJS.ProcessEnv = process.env): Ports => {
  const slot = Number.parseInt(createHash('sha256').update(root).digest('hex').slice(0, 8), 16) % 100;
  return {
    slot,
    http: Number.parseInt(env.DX_PERF_PORT ?? '', 10) || 4400 + slot,
    debug: Number.parseInt(env.DX_PERF_DEBUG_PORT ?? '', 10) || 9500 + slot,
  };
};

export const machineLoad = (): { load: number; cores: number } => ({
  load: os.loadavg()[0],
  cores: os.availableParallelism(),
});

/** Node strips TypeScript from `.ts` entry points from 22.18. */
export const nodeSupported = (version = process.versions.node): boolean => {
  const [major, minor] = version.split('.').map((part) => Number.parseInt(part, 10));
  return major > 22 || (major === 22 && minor >= 18);
};

/**
 * Content hash of the files that define what a measurement means. Two rows with different hashes
 * measured different things, however alike their numbers look.
 */
export const harnessHash = (root: string, paths: ReadonlyArray<string>): string => {
  const files = git(root, ['ls-files', '--', ...paths])
    .split('\n')
    .filter((file) => file && !file.endsWith('.test.ts'))
    .sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash
      .update(file)
      .update('\0')
      .update(readFileSync(path.join(root, file)));
  }
  return hash.digest('hex').slice(0, 12);
};

/** Tracked files that differ from HEAD; untracked files are left out because a build never reads them. */
export const trackedChanges = (root: string): string[] =>
  git(root, ['status', '--porcelain', '--untracked-files=no']).split('\n').filter(Boolean);

export const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
