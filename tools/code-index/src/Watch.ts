//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import { type FSWatcher, existsSync, readdirSync, statSync, watch } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';

import * as Indexer from './Indexer.ts';
import type * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';

/**
 * Keeps the index current while `serve` runs. The server holds the store open, and RocksDB admits
 * one process, so a separate `code-index index` cannot refresh it in the meantime. `serve` runs this
 * on its own thread (`IndexThread.ts`).
 */

/** How long a burst of changes (a save, a branch switch) settles before the pass that covers it. */
export const DEFAULT_DEBOUNCE_MS = 300;

/** Directories whose churn is never a source change; the store itself lives in `node_modules`. */
const IGNORED = ['node_modules', '.git', 'dist', 'target', '.moon'];

/**
 * What the watcher reports: a pass starting, each phase of it, a pass that finished, and one that
 * failed (or a watch that could not be renewed). A schema, since `IndexThread` posts these between
 * threads.
 */
export const Event = Schema.Union([
  /** Carries the reasoner count so a reader can tell how many phases the pass has before it ends. */
  Schema.TaggedStruct('Started', { reasoners: Schema.Number }),
  Schema.TaggedStruct('Progress', { progress: Indexer.Progress }),
  Schema.TaggedStruct('Passed', {
    indexed: Schema.Number,
    removed: Schema.Number,
    derived: Schema.Number,
    reasoned: Schema.Boolean,
    totalMs: Schema.Number,
  }),
  Schema.TaggedStruct('Failed', { message: Schema.String }),
]);

export type Event = typeof Event.Type;

/** The console lines `serve` has always written: a pass that changed something, and every failure. */
export const log = (event: Event): Effect.Effect<void> => {
  switch (event._tag) {
    case 'Started':
    case 'Progress':
      return Effect.void;
    case 'Passed':
      return event.indexed + event.removed > 0 || event.reasoned
        ? Console.log(
            `code-index · ${event.indexed} indexed, ${event.removed} removed` +
              (event.reasoned ? `, ${event.derived} derived` : '') +
              ` in ${(event.totalMs / 1000).toFixed(1)}s`,
          )
        : Effect.void;
    case 'Failed':
      return Console.error(`code-index · ${event.message}`);
  }
};

export type Options = {
  readonly root: string;
  readonly reasoners: readonly Reasoner.Reasoner[];
  readonly debounceMs?: number;
  /** Told about every phase and pass; defaults to {@link log}. */
  readonly onEvent?: (event: Event) => Effect.Effect<void>;
};

/** Whether a changed path, relative to the root, could be a source file the indexer reads. */
export const relevant = (path: string): boolean => !path.split(/[\\/]/).some((segment) => IGNORED.includes(segment));

/**
 * The descriptors a process may hold and still spawn. On macOS each directory watch is a descriptor, and
 * once a Bun process holds about 10,240 (measured with Bun 1.3.11: 10,200 watches fine, 10,300 not) no
 * child it spawns works: `git ls-files` comes back empty, and a pass read that as every file gone.
 */
export const SPAWN_DESCRIPTOR_LIMIT = 10_000;

/** Descriptors kept free for what the server opens after a re-watch (Vite watches each module it serves). */
export const DESCRIPTOR_HEADROOM = 1_500;

/**
 * The most directories this watcher may hold now: what the limit leaves once every other descriptor the
 * process has open is counted. Not a constant, since the dev server's own watches grow as the page loads.
 * Where `/dev/fd` cannot be read, the whole limit, as before.
 */
const watchBudget = (held: number): number => {
  let open: number;
  try {
    open = readdirSync('/dev/fd').length;
  } catch {
    return SPAWN_DESCRIPTOR_LIMIT - DESCRIPTOR_HEADROOM;
  }
  return Math.max(0, SPAWN_DESCRIPTOR_LIMIT - DESCRIPTOR_HEADROOM - (open - held));
};

/** How often a pass runs when some directories go unwatched, so a change in one is still picked up. */
export const UNWATCHED_POLL_MS = 30_000;

/**
 * The directories to watch within `max`: those holding the most indexed files first, since a change is
 * likeliest there, then the root and its ancestors' order as tie-break. `skipped` counts the rest.
 */
export const budgeted = (paths: readonly string[], max: number): { watched: Set<string>; skipped: number } => {
  const all = directories(paths);
  if (all.size <= max) {
    return { watched: all, skipped: 0 };
  }
  const files = new Map<string, number>();
  for (const path of paths) {
    files.set(dirname(path), (files.get(dirname(path)) ?? 0) + 1);
  }
  const ranked = [...all].toSorted(
    (left, right) => (files.get(right) ?? 0) - (files.get(left) ?? 0) || left.length - right.length,
  );
  return { watched: new Set(ranked.slice(0, max)), skipped: all.size - max };
};

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
    const report = options.onEvent ?? log;
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
    let polling = false;
    const rewatch = Effect.gen(function* () {
      const { watched: wanted, skipped } = budgeted(
        (yield* store.fileStates()).map((state) => state.path),
        watchBudget(watchers.size),
      );
      // A directory gone, or one that fell out of the budget, gives its descriptor back.
      for (const [dir, watcher] of watchers) {
        if (!wanted.has(dir) || !existsSync(join(options.root, dir))) {
          watcher.close();
          watchers.delete(dir);
        }
      }
      const before = watchers.size;
      const failed = [...wanted].filter((dir) => !add(dir)).length;
      if (failed > 0) {
        yield* report({ _tag: 'Failed', message: `${failed} directories could not be watched` });
      }
      // What the budget leaves unwatched is caught by a periodic pass, which costs a crawl when nothing changed.
      if (skipped > 0 && !polling) {
        polling = true;
        yield* Console.log(
          `code-index · watching ${wanted.size} directories, polling for the other ${skipped} every ${UNWATCHED_POLL_MS / 1000}s`,
        );
        yield* Effect.forever(
          Effect.sleep(UNWATCHED_POLL_MS).pipe(
            Effect.andThen(Effect.sync(() => Queue.offerUnsafe(changes, undefined))),
          ),
        ).pipe(Effect.forkScoped);
      }
      // A file written between the pass's crawl and a new watch raised no event; one more pass sees it.
      if (watchers.size > before) {
        Queue.offerUnsafe(changes, undefined);
      }
    });

    const pass = Effect.andThen(
      report({ _tag: 'Started', reasoners: options.reasoners.length }),
      Indexer.run({
        root: options.root,
        reasoners: options.reasoners,
        summarize: false,
        // One core stays free for the server's thread, which otherwise queues behind the parsers for CPU.
        workers: Math.max(1, Math.min(availableParallelism() - 1, 8)),
        onProgress: (progress) => report({ _tag: 'Progress', progress }),
      }),
    ).pipe(
      Effect.scoped,
      Effect.flatMap((result) =>
        report({
          _tag: 'Passed',
          indexed: result.indexed,
          removed: result.removed,
          derived: result.derived,
          reasoned: result.reasoned,
          totalMs: result.timings.totalMs,
        }),
      ),
      Effect.catchCause((cause) => report({ _tag: 'Failed', message: `reindex failed\n${Cause.pretty(cause)}` })),
      Effect.andThen(
        rewatch.pipe(
          Effect.catchCause((cause) => report({ _tag: 'Failed', message: `watch failed\n${Cause.pretty(cause)}` })),
        ),
      ),
    );

    yield* pass;
    // The dev server keeps opening watches as the page loads modules, so the budget is checked again
    // on a timer, not only after a pass: this watcher gives descriptors back before the process runs out.
    yield* Effect.forever(
      Effect.sleep(UNWATCHED_POLL_MS).pipe(
        Effect.andThen(
          rewatch.pipe(
            Effect.catchCause((cause) => report({ _tag: 'Failed', message: `watch failed\n${Cause.pretty(cause)}` })),
          ),
        ),
      ),
    ).pipe(Effect.forkScoped);
    return yield* Effect.forever(
      Effect.gen(function* () {
        yield* Queue.take(changes);
        yield* Effect.sleep(options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
        yield* Queue.clear(changes);
        yield* pass;
      }),
    );
  });
