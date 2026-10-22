//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { isTauri } from '@dxos/util';

import { SpecSyncError } from '../errors.ts';

/** The dev server's route; must match `specFsPlugin` in composer-app's vite config. */
export const SPEC_FS_ROUTE = '/__dx/spec-fs';

/** A local checkout of a repository. */
export type RepoRoot = {
  /** `owner/repo`. */
  repo: string;
  /** Absolute path of the working tree. */
  path: string;
};

/**
 * The local files a spec syncs with. Composer reaches them through the Tauri fs plugin on the desktop
 * and through a dev-only vite route in the browser; both sides speak absolute paths.
 */
export type SpecFs = {
  readonly kind: 'tauri' | 'dev';
  /** The file's text, or undefined when it does not exist. */
  read: (path: string) => Effect.Effect<string | undefined, SpecSyncError>;
  write: (path: string, content: string) => Effect.Effect<void, SpecSyncError>;
  /** Files under `dir` whose names end with `suffix`, relative to `dir`; dot-directories and node_modules are skipped. */
  list: (dir: string, suffix: string) => Effect.Effect<string[], SpecSyncError>;
  /** Checkouts the host knows without configuration: the dev server's own working tree. */
  roots: () => Effect.Effect<RepoRoot[], SpecSyncError>;
};

const attempt = <T>(message: string, run: () => Promise<T>): Effect.Effect<T, SpecSyncError> =>
  Effect.tryPromise({ try: run, catch: (cause) => new SpecSyncError({ message, cause }) });

const SKIP_DIRS = new Set(['node_modules', 'dist', 'target']);

const tauriSpecFs = (): SpecFs => {
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
    read: (path) =>
      attempt(`Read failed: ${path}`, async () => {
        const { exists, readTextFile } = await fs();
        return (await exists(path)) ? readTextFile(path) : undefined;
      }),
    write: (path, content) =>
      attempt(`Write failed: ${path}`, async () => {
        const { writeTextFile } = await fs();
        await writeTextFile(path, content);
      }),
    list: (dir, suffix) => attempt(`List failed: ${dir}`, () => list(dir, suffix)),
    // The desktop app has no working tree of its own; checkouts come from settings.
    roots: () => Effect.succeed([]),
  };
};

const devSpecFs = (): SpecFs => {
  const request = async (path: string, init?: RequestInit): Promise<Response> => {
    const response = await fetch(`${SPEC_FS_ROUTE}${path}`, init);
    if (!response.ok && response.status !== 404) {
      throw new Error(`${response.status} ${await response.text()}`);
    }
    return response;
  };

  return {
    kind: 'dev',
    read: (path) =>
      attempt(`Read failed: ${path}`, async () => {
        const response = await request(`/file?path=${encodeURIComponent(path)}`);
        return response.status === 404 ? undefined : response.text();
      }),
    write: (path, content) =>
      attempt(`Write failed: ${path}`, async () => {
        await request(`/file?path=${encodeURIComponent(path)}`, { method: 'PUT', body: content });
      }),
    list: (dir, suffix) =>
      attempt(`List failed: ${dir}`, async () => {
        const response = await request(`/list?dir=${encodeURIComponent(dir)}&suffix=${encodeURIComponent(suffix)}`);
        return response.status === 404 ? [] : (await response.json()).files;
      }),
    roots: () =>
      attempt('No spec-fs route on this server', async () => {
        const response = await request('/roots');
        // A deployed app answers unknown routes with its HTML shell, which means there is no dev server here.
        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(`Unexpected response from ${SPEC_FS_ROUTE}`);
        }
        return (await response.json()).roots;
      }),
  };
};

let instance: SpecFs | undefined;

/** The file service for this host: Tauri on the desktop, the dev server's route in the browser. */
export const getSpecFs = (): SpecFs => (instance ??= isTauri() ? tauriSpecFs() : devSpecFs());
