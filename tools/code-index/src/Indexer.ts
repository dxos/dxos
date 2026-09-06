//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import type * as RpcClientError from 'effect/unstable/rpc/RpcClientError';
import type * as WorkerError from 'effect/unstable/workers/WorkerError';
import { realpath } from 'node:fs/promises';
import { availableParallelism } from 'node:os';

import * as Crawler from './Crawler.ts';
import * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';
import * as Pool from './worker/Pool.ts';
import type * as Protocol from './worker/Protocol.ts';

/**
 * The main thread's half of indexing: crawl the repository, diff it against the ledger, hand the
 * changed files to the worker pool in batches, and upsert the documents that come back. Parsing
 * happens off-thread; only this thread writes to the store.
 */

export type Options = {
  readonly root: string;
  /** Number of parsing workers (default: available parallelism, capped at 8). */
  readonly workers?: number;
  /** Files per RPC batch (default 64). */
  readonly batchSize?: number;
  /** Reindex every file, ignoring recorded mtimes. */
  readonly force?: boolean;
  readonly extensions?: readonly string[];
  /** Reasoners run once the pass has committed; omitted or empty, the reasoning phase is skipped. */
  readonly reasoners?: readonly Reasoner.Reasoner[];
};

/**
 * Wall-clock for the whole pass, and per-phase durations. `parse` and `commit` are summed across
 * concurrent batches, so they overlap each other and exceed `total` on a wide pool.
 */
export type Timings = {
  readonly scanMs: number;
  readonly parseMs: number;
  readonly commitMs: number;
  readonly reasonMs: number;
  readonly totalMs: number;
};

export type Result = {
  readonly root: string;
  readonly scanned: number;
  readonly indexed: number;
  readonly unchanged: number;
  readonly removed: number;
  readonly skipped: readonly Protocol.SkippedFile[];
  /** Size of the derived graph after the pass, whether or not this pass recomputed it. */
  readonly derived: number;
  /** Whether the reasoners ran; a pass that changed nothing leaves their graphs alone. */
  readonly reasoned: boolean;
  /** What each reasoner concluded, in the order they ran. */
  readonly reasoners: readonly Reasoner.Outcome[];
  readonly timings: Timings;
};

export const DEFAULT_BATCH_SIZE = 64;

const millis = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<[number, A], E, R> =>
  Effect.map(Effect.timed(effect), ([duration, value]) => [Duration.toMillis(duration), value]);

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

/** Index `root` into the ambient {@link Store.Store}, reusing everything whose mtime is unchanged. */
export const run = (
  options: Options,
): Effect.Effect<
  Result,
  Crawler.CrawlError | Store.StoreError | WorkerError.WorkerError | RpcClientError.RpcClientError,
  Store.Store | Scope.Scope
> =>
  Effect.gen(function* () {
    const store = yield* Store.Store;
    // The resolver reports real paths, so the root has to be one too or every import would look
    // like it left the repository (macOS `/tmp` -> `/private/tmp`).
    const root = yield* Effect.tryPromise({
      try: () => realpath(options.root),
      catch: (cause) => new Crawler.CrawlError({ message: `No such directory: ${options.root}`, cause }),
    });
    const workers = options.workers ?? Math.min(availableParallelism(), 8);
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

    const started = Date.now();
    const [scanMs, { entries, changed, removed }] = yield* millis(
      Effect.gen(function* () {
        const entries = yield* Crawler.crawl(root, { extensions: options.extensions });
        const states = yield* store.fileStates();
        const recorded = new Map(states.map((state) => [state.path, state.mtime]));
        const present = new Set(entries.map((entry) => entry.path));
        return {
          entries,
          changed: entries.filter((entry) => options.force || recorded.get(entry.path) !== entry.mtime),
          removed: states.filter((state) => !present.has(state.path)),
        };
      }),
    );

    let commitMs = 0;
    const [removalMs] = yield* millis(
      Effect.forEach(removed, (state) => store.removeFile(state.path), { discard: true }),
    );
    commitMs += removalMs;

    const skipped: Protocol.SkippedFile[] = [];
    let parseMs = 0;
    let indexed = 0;

    if (changed.length > 0) {
      const client = yield* Pool.make(workers);
      yield* Effect.forEach(
        chunk(changed, batchSize),
        (batch) =>
          Effect.gen(function* () {
            const [batchParseMs, response] = yield* millis(client.AnalyzeBatch({ root, files: batch }));
            parseMs += batchParseMs;
            skipped.push(...response.skipped);
            // Documents are committed one file at a time: each is its own graph swap plus ledger
            // row, so an interruption costs at most the file in flight.
            const [batchCommitMs] = yield* millis(
              Effect.forEach(response.analyzed, (file) => store.putDocument(file.document), { discard: true }),
            );
            commitMs += batchCommitMs;
            indexed += response.analyzed.length;
          }),
        { concurrency: workers, discard: true },
      );
    }

    yield* store.setMeta('root', root);
    yield* store.setMeta('indexedAt', new Date().toISOString());

    // Reasoning closes the pass: each reasoner's graph is recomputed from the facts this pass left
    // behind, so a conclusion can never outlive the import or file that entailed it. A pass that
    // changed nothing would derive exactly what is already there, so it is skipped — reasoning is
    // whole-graph and by far the most expensive phase.
    const dirty = indexed > 0 || removed.length > 0;
    const reasoners = options.reasoners ?? [];
    const willReason = reasoners.length > 0 && dirty;
    const [reasonMs, outcomes] = yield* millis(willReason ? Reasoner.run(reasoners) : Effect.succeed([]));
    const derived = willReason
      ? outcomes.reduce((total, outcome) => total + outcome.derived, 0)
      : (yield* store.derived()).length;

    return {
      root,
      scanned: entries.length,
      indexed,
      unchanged: entries.length - changed.length,
      removed: removed.length,
      skipped,
      derived,
      reasoned: willReason,
      reasoners: outcomes,
      timings: { scanMs, parseMs, commitMs, reasonMs, totalMs: Date.now() - started },
    };
  });
