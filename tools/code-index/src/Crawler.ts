//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';

/**
 * Discovers what to index: the git repository root, and the tracked-or-untracked-but-not-ignored
 * files inside it with their mtimes. Git owns the ignore rules, so the index and the repository
 * never disagree about what a file is.
 */

export class CrawlError extends Data.TaggedError('code-index/CrawlError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type Entry = {
  readonly path: string;
  readonly mtime: number;
};

export const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md'];

/** Store location for a repository: beside its dependencies, never inside the working tree. */
export const storeDir = (root: string): string => join(root, 'node_modules', '.code-index');

const run = (args: string[], cwd: string): Effect.Effect<string, CrawlError> =>
  Effect.tryPromise({
    try: async () => (await promisify(execFile)('git', args, { cwd, maxBuffer: 256 * 1024 * 1024 })).stdout,
    catch: (cause) => new CrawlError({ message: `git ${args.join(' ')} failed in ${cwd}`, cause }),
  });

/** The git working-tree root containing `cwd` — the default indexing root. */
export const gitRoot = (cwd: string = process.cwd()): Effect.Effect<string, CrawlError> =>
  Effect.map(run(['rev-parse', '--show-toplevel'], cwd), (stdout) => stdout.trim());

export type CrawlOptions = {
  readonly extensions?: readonly string[];
};

/** Every non-ignored file under `root` with an indexable extension, plus its mtime. */
export const crawl = (root: string, options?: CrawlOptions): Effect.Effect<Entry[], CrawlError> =>
  Effect.gen(function* () {
    const extensions = new Set(options?.extensions ?? DEFAULT_EXTENSIONS);
    const stdout = yield* run(['ls-files', '--cached', '--others', '--exclude-standard', '-z'], root);
    const paths = stdout
      .split('\0')
      .filter((path) => path.length > 0 && extensions.has(extname(path)))
      .sort();

    const entries = yield* Effect.forEach(
      paths,
      (path) =>
        Effect.tryPromise({
          try: () => stat(join(root, path)),
          catch: (cause) => new CrawlError({ message: `Failed to stat ${path}`, cause }),
        }).pipe(
          Effect.map((stats): Entry[] => (stats.isFile() ? [{ path, mtime: Math.floor(stats.mtimeMs) }] : [])),
          // A file listed by git but gone from disk (a race with a delete) is simply not indexed.
          Effect.catchCause(() => Effect.succeed<Entry[]>([])),
        ),
      { concurrency: 32 },
    );

    return entries.flat();
  });
