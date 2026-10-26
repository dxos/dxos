//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';
import { isTauri } from '@dxos/util';

/** The dev server's route; must match `fileSystemPlugin` in composer-app's vite config. */
export const ROUTE = '/__dx/fs';

/** Reading, writing or listing a local file failed. The underlying failure, where there is one, is the `cause`. */
export class FileSystemError extends BaseError.extend('FileSystemError', 'File system request failed.') {}

/** A local checkout of a repository. */
export type RepoRoot = {
  /** `owner/repo`. */
  repo: string;
  /** Absolute path of the working tree. */
  path: string;
};

/** The open pull request a branch heads. */
export type GitPullRequest = { number: number; url: string; title: string; base: string };

/** Where a checkout stands against the branch it will merge into; must match composer-app's `src/vite/git.ts`. */
export type GitStatus = {
  /** Current branch; absent on a detached HEAD. */
  branch?: string;
  /** Commit HEAD points at. */
  head: string;
  /** The ref the branch is compared with: the pull request's base, else the remote's default branch. */
  base: string;
  /** Where the branch forked from `base`; absent when they share no history. */
  mergeBase?: string;
  pullRequest?: GitPullRequest;
};

/** Read-only git queries about a local file's repository. */
export type Git = {
  /** The status of the repository holding `path`, or undefined when it is not in a git working tree. */
  status: (path: string) => Effect.Effect<GitStatus | undefined, FileSystemError>;
  /** The file's text at commit `rev`, or undefined when it did not exist there. */
  show: (path: string, rev: string) => Effect.Effect<string | undefined, FileSystemError>;
};

/**
 * Local files by absolute path, for any plugin. The desktop app reaches them through the Tauri fs plugin and a
 * Composer dev server through a dev-only route; a deployed web app has neither, so `available` answers false there.
 */
export type FileSystem = {
  readonly kind: 'tauri' | 'dev';
  available: () => Effect.Effect<boolean>;
  /** The file's text, or undefined when it does not exist. */
  read: (path: string) => Effect.Effect<string | undefined, FileSystemError>;
  /** Writes the file, creating its parent directories. */
  write: (path: string, content: string) => Effect.Effect<void, FileSystemError>;
  remove: (path: string) => Effect.Effect<void, FileSystemError>;
  /** Files under `dir`, relative to it and ending with `suffix` when given; dot-directories and node_modules are skipped. */
  list: (dir: string, suffix?: string) => Effect.Effect<string[], FileSystemError>;
  /** Checkouts the host knows without configuration: the dev server's own working tree. */
  roots: () => Effect.Effect<RepoRoot[], FileSystemError>;
  /** Absent where the host cannot run git (the desktop app). */
  git?: Git;
};

const attempt = <T>(message: string, run: () => Promise<T>): Effect.Effect<T, FileSystemError> =>
  Effect.tryPromise({ try: run, catch: (cause) => new FileSystemError({ message, cause }) });

const SKIP_DIRS = new Set(['node_modules', 'dist', 'target']);

const parentOf = (path: string): string => path.slice(0, Math.max(path.lastIndexOf('/'), 0));

const tauriFileSystem = (): FileSystem => {
  const fs = () => import('@tauri-apps/plugin-fs');
  const list = async (dir: string, suffix: string, prefix = ''): Promise<string[]> => {
    const { readDir } = await fs();
    const entries = await readDir(`${dir}/${prefix}`);
    const nested = await Promise.all(
      entries.map(async (entry): Promise<string[]> => {
        if (entry.isDirectory && !entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) {
          return list(dir, suffix, `${prefix}${entry.name}/`);
        }
        return entry.isFile && entry.name.endsWith(suffix) ? [`${prefix}${entry.name}`] : [];
      }),
    );
    return nested.flat();
  };

  return {
    kind: 'tauri',
    available: () => Effect.succeed(true),
    read: (path) =>
      attempt(`Read failed: ${path}`, async () => {
        const { exists, readTextFile } = await fs();
        return (await exists(path)) ? readTextFile(path) : undefined;
      }),
    write: (path, content) =>
      attempt(`Write failed: ${path}`, async () => {
        const { mkdir, writeTextFile } = await fs();
        const parent = parentOf(path);
        if (parent) {
          await mkdir(parent, { recursive: true });
        }
        await writeTextFile(path, content);
      }),
    remove: (path) =>
      attempt(`Remove failed: ${path}`, async () => {
        const { exists, remove } = await fs();
        if (await exists(path)) {
          await remove(path);
        }
      }),
    list: (dir, suffix = '') =>
      attempt(`List failed: ${dir}`, async () => {
        const { exists } = await fs();
        return (await exists(dir)) ? list(dir, suffix) : [];
      }),
    // The desktop app has no working tree of its own; checkouts come from settings.
    roots: () => Effect.succeed([]),
  };
};

const devFileSystem = (): FileSystem => {
  const request = async (path: string, init?: RequestInit): Promise<Response> => {
    const url = `${ROUTE}${path}`;
    const response = await fetch(url, init);
    // A deployed app answers unknown routes with its HTML shell, which means there is no dev server here.
    if (response.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`No ${ROUTE} route on this server (${init?.method ?? 'GET'} ${url})`);
    }
    if (!response.ok && response.status !== 404) {
      throw new Error(`${init?.method ?? 'GET'} ${url} failed: ${response.status} ${await response.text()}`);
    }
    return response;
  };
  const file = (path: string) => `/file?path=${encodeURIComponent(path)}`;

  const roots = () =>
    attempt(`No ${ROUTE} route on this server`, async () => {
      const response = await request('/roots');
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`Unexpected response from ${ROUTE}`);
      }
      return (await response.json()).roots;
    });

  return {
    kind: 'dev',
    available: () =>
      roots().pipe(
        Effect.as(true),
        Effect.catch(() => Effect.succeed(false)),
      ),
    read: (path) =>
      attempt(`Read failed: ${path}`, async () => {
        const response = await request(file(path));
        return response.status === 404 ? undefined : response.text();
      }),
    write: (path, content) =>
      attempt(`Write failed: ${path}`, async () => {
        await request(file(path), { method: 'PUT', body: content });
      }),
    remove: (path) =>
      attempt(`Remove failed: ${path}`, async () => {
        await request(file(path), { method: 'DELETE' });
      }),
    list: (dir, suffix = '') =>
      attempt(`List failed: ${dir}`, async () => {
        const response = await request(`/list?dir=${encodeURIComponent(dir)}&suffix=${encodeURIComponent(suffix)}`);
        return response.status === 404 ? [] : (await response.json()).files;
      }),
    roots,
    git: {
      status: (path) =>
        attempt(`Git status failed: ${path}`, async () => {
          const response = await request(`/git/status?path=${encodeURIComponent(path)}`);
          return (await response.json()).status ?? undefined;
        }),
      show: (path, rev) =>
        attempt(`Git show failed: ${path}@${rev}`, async () => {
          const response = await request(`/git/show?path=${encodeURIComponent(path)}&rev=${encodeURIComponent(rev)}`);
          return response.status === 404 ? undefined : response.text();
        }),
    },
  };
};

let instance: FileSystem | undefined;

/** The file system for this host: Tauri on the desktop, the dev server's route in the browser. */
export const get = (): FileSystem => (instance ??= isTauri() ? tauriFileSystem() : devFileSystem());
