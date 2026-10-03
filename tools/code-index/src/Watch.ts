//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import type * as Scope from 'effect/Scope';
import { type FSWatcher, existsSync, statSync, watch } from 'node:fs';
import { dirname, join } from 'node:path';

import * as Indexer from './Indexer.ts';
import type * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';

/**
 * Keeps the index current while `serve` runs. The server holds the store open, and RocksDB admits
 * one process, so a separate `code-index index` cannot refresh it in the meantime.
 */

/** How long a burst of changes (a save, a branch switch) settles before the pass that covers it. */
export const DEFAULT_DEBOUNCE_MS = 300;

/** Directories whose churn is never a source change; the store itself lives in `node_modules`. */
const IGNORED = ['node_modules', '.git', 'dist', 'target', '.moon'];

export type Options = {
  readonly root: string;
  readonly reasoners: readonly Reasoner.Reasoner[];
  readonly debounceMs?: number;
};

/** Whether a changed path, relative to the root, could be a source file the indexer reads. */
export const relevant = (path: string): boolean => !path.split(/[\\/]/).some((segment) => IGNORED.includes(segment));

/** Every directory holding an indexed file, and its ancestors up to the root (`.`), which see new subdirectories. */
export const directories = (paths: readonly string[]): Set<string> => {
  const found = new Set<string>(['.']);
  for (const path of paths) {
    for (let dir = dirname(path); !found.has(dir); dir = dirname(dir)) {
      found.add(dir);
    }
  }
  return found;
};

/**
 * An incremental pass now, then one after every burst of changes under `options.root`, until the
 * scope closes. A failed pass is reported and the watch goes on: the next change retries it.
 *
 * Each directory the index covers is watched on its own, re-derived after every pass: a recursive
 * watch would also register every directory under `node_modules`, past the inotify limit in a
 * large monorepo.
 */
export const run = (options: Options): Effect.Effect<never, never, Store.Store | Scope.Scope> =>
  Effect.gen(function* () {
    const store = yield* Store.Store;
    // One pending signal is enough: a pass reads every file's mtime, not the events.
    const changes = yield* Queue.dropping<void>(1);
    const watchers = new Map<string, FSWatcher>();
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const watcher of watchers.values()) {
          watcher.close();
        }
      }),
    );

    /** Watches `dir`, and any directory created in it from then on; true unless the watch failed. */
    const add = (dir: string): boolean => {
      if (watchers.has(dir)) {
        return true;
      }
      try {
        const watcher = watch(join(options.root, dir), (_event, name) => {
          if (name !== null && !relevant(name)) {
            return;
          }
          Queue.offerUnsafe(changes, undefined);
          // Watched at once, not after the pass: a directory created empty would otherwise go
          // unwatched until something else changed, missing the files written into it.
          const child = name === null ? undefined : join(dir, name);
          if (child && statSync(join(options.root, child), { throwIfNoEntry: false })?.isDirectory()) {
            add(child);
          }
        });
        watcher.on('error', () => {
          watcher.close();
          watchers.delete(dir);
        });
        watchers.set(dir, watcher);
        return true;
      } catch {
        return false;
      }
    };

    // Directories that hold indexed files gain a watch; one is dropped only once it is gone, since
    // an empty directory may be about to receive files.
    const rewatch = Effect.gen(function* () {
      for (const [dir, watcher] of watchers) {
        if (!existsSync(join(options.root, dir))) {
          watcher.close();
          watchers.delete(dir);
        }
      }
      const wanted = directories((yield* store.fileStates()).map((state) => state.path));
      const before = watchers.size;
      const failed = [...wanted].filter((dir) => !add(dir)).length;
      if (failed > 0) {
        yield* Console.error(`code-index · ${failed} directories could not be watched`);
      }
      // A file written between the pass's crawl and a new watch raised no event; one more pass sees it.
      if (watchers.size > before) {
        Queue.offerUnsafe(changes, undefined);
      }
    });

    const pass = Indexer.run({ root: options.root, reasoners: options.reasoners, summarize: false }).pipe(
      Effect.scoped,
      Effect.flatMap((result) =>
        result.indexed + result.removed > 0 || result.reasoned
          ? Console.log(
              `code-index · ${result.indexed} indexed, ${result.removed} removed` +
                (result.reasoned ? `, ${result.derived} derived` : '') +
                ` in ${(result.timings.totalMs / 1000).toFixed(1)}s`,
            )
          : Effect.void,
      ),
      Effect.catchCause((cause) => Console.error(`code-index · reindex failed\n${Cause.pretty(cause)}`)),
      Effect.andThen(
        rewatch.pipe(Effect.catchCause((cause) => Console.error(`code-index · watch failed\n${Cause.pretty(cause)}`))),
      ),
    );

    yield* pass;
    return yield* Effect.forever(
      Effect.gen(function* () {
        yield* Queue.take(changes);
        yield* Effect.sleep(options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
        yield* Queue.clear(changes);
        yield* pass;
      }),
    );
  });
