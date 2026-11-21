//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { lstat, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
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

export const DEFAULT_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdl',
];

/**
 * Crawled whatever their extension. `.yml` is not in the extension set — a repository is full of
 * workflow and config YAML the index has no use for — but `moon.yml` carries the package layer.
 */
export const DEFAULT_FILENAMES = ['moon.yml'];

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
  readonly filenames?: readonly string[];
};

/** Paths per `check-ignore` call: well under the platform's argument-size limit for repository paths. */
const CHECK_IGNORE_BATCH = 500;

/**
 * The paths git ignores, of those given. `check-ignore` exits 1 when it ignores none of them,
 * which is an answer, not a failure. Paths go as arguments, the same way `ls-files` is run: the
 * `--stdin` form crashed the server's indexing worker (SIGTRAP inside Bun 1.3.11) on its startup pass,
 * though an isolated worker writing a git child's stdin does not, so that trigger is not pinned down.
 */
export const ignored = (root: string, paths: readonly string[]): Effect.Effect<Set<string>, CrawlError> => {
  const check = (batch: readonly string[]) =>
    Effect.tryPromise({
      try: () =>
        // `-z` needs `--stdin`, so the answer is one path per line; quotePath off leaves non-ASCII bare.
        promisify(execFile)('git', ['-c', 'core.quotePath=false', 'check-ignore', '--', ...batch], {
          cwd: root,
          maxBuffer: 64 * 1024 * 1024,
        })
          .then(({ stdout }) => stdout)
          .catch((error: unknown) =>
            typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 1
              ? ''
              : Promise.reject(error),
          ),
      catch: (cause) => new CrawlError({ message: `git check-ignore failed in ${root}`, cause }),
    }).pipe(
      Effect.map((stdout) =>
        stdout
          .split('\n')
          .filter((line) => line.length > 0)
          .map(unquote),
      ),
    );

  return Effect.forEach(
    Array.from({ length: Math.ceil(paths.length / CHECK_IGNORE_BATCH) }, (_, index) =>
      paths.slice(index * CHECK_IGNORE_BATCH, (index + 1) * CHECK_IGNORE_BATCH),
    ),
    // git refuses a whole batch for one path it cannot judge (inside a staged submodule, exit 128); asked
    // alone, such a path is unknown rather than ignored, so the file is kept and the pass goes on.
    (batch) =>
      check(batch).pipe(
        Effect.catch(() =>
          Effect.forEach(batch, (path) => check([path]).pipe(Effect.orElseSucceed((): string[] => [])), {
            concurrency: 8,
          }).pipe(Effect.map((answers) => answers.flat())),
        ),
      ),
  ).pipe(Effect.map((outputs) => new Set(outputs.flat())));
};

/**
 * A path as git prints it outside `-z`: one with a quote, a backslash or a control character comes
 * back in double quotes with C escapes, whatever `core.quotePath` says, and must be decoded to
 * compare with the path that was asked about.
 */
export const unquote = (line: string): string => {
  if (!line.startsWith('"') || !line.endsWith('"')) {
    return line;
  }
  const bytes: number[] = [];
  const body = line.slice(1, -1);
  const SIMPLE: Record<string, number> = {
    'a': 7,
    'b': 8,
    't': 9,
    'n': 10,
    'v': 11,
    'f': 12,
    'r': 13,
    '"': 34,
    '\\': 92,
  };
  for (let index = 0; index < body.length; index++) {
    // By code point, not code unit: a character outside the BMP is two units, and encoding each alone breaks it.
    const char = String.fromCodePoint(body.codePointAt(index) ?? 0);
    if (char !== '\\') {
      bytes.push(...Buffer.from(char, 'utf8'));
      index += char.length - 1;
      continue;
    }
    const next = body[index + 1];
    const octal = /^[0-7]{3}/.exec(body.slice(index + 1));
    if (octal) {
      bytes.push(Number.parseInt(octal[0], 8));
      index += 3;
    } else {
      bytes.push(SIMPLE[next] ?? next.charCodeAt(0));
      index += 1;
    }
  }
  return Buffer.from(bytes).toString('utf8');
};

/** Whether a stat failed because the path does not exist, rather than because it could not be read. */
const isAbsent = (error: unknown): boolean => {
  const code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
  return code === 'ENOENT' || code === 'ENOTDIR';
};

/**
 * Whether a path may still exist: false only when a stat says it does not (`ENOENT`, `ENOTDIR`).
 * A stat that fails otherwise (EACCES) cannot tell, and a caller deciding to delete must not read
 * that as absence.
 */
export const mayExist = (path: string): Effect.Effect<boolean> =>
  Effect.promise(() =>
    lstat(path).then(
      () => true,
      (error: unknown) => !isAbsent(error),
    ),
  );

/** Every non-ignored file under `root` with an indexable extension, plus its mtime. */
export const crawl = (root: string, options?: CrawlOptions): Effect.Effect<Entry[], CrawlError> =>
  Effect.gen(function* () {
    const extensions = new Set(options?.extensions ?? DEFAULT_EXTENSIONS);
    const filenames = new Set(options?.filenames ?? DEFAULT_FILENAMES);
    const stdout = yield* run(['ls-files', '--cached', '--others', '--exclude-standard', '-z'], root);
    const paths = stdout
      .split('\0')
      .filter((path) => path.length > 0 && (extensions.has(extname(path)) || filenames.has(basename(path))))
      .sort();

    const entries = yield* Effect.forEach(
      paths,
      (path) =>
        Effect.tryPromise({
          // A file listed by git but gone from disk (a race with a delete) is simply not indexed.
          try: () =>
            stat(join(root, path)).catch((error: unknown) => (isAbsent(error) ? undefined : Promise.reject(error))),
          // Anything else (EMFILE while an install holds every descriptor, EACCES) says nothing about
          // whether the file exists; failing the crawl stops the pass before it removes what it could not see.
          catch: (cause) => new CrawlError({ message: `Failed to stat ${path}`, cause }),
        }).pipe(Effect.map((stats): Entry[] => (stats?.isFile() ? [{ path, mtime: Math.floor(stats.mtimeMs) }] : []))),
      { concurrency: 32 },
    );

    return entries.flat();
  });
