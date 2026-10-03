//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import type * as RpcClientError from 'effect/rpc/RpcClientError';
import type * as Scope from 'effect/Scope';
import type * as WorkerError from 'effect/workers/WorkerError';
import { readFile, realpath, stat } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import * as Crawler from './Crawler.ts';
import * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';
import { contentHash } from './worker/analyzers/common.ts';
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
  /** Files committed to the store at once (default 512): one ledger transaction and one graph write. */
  readonly commitSize?: number;
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
  /** Of `parseMs`, worker time analyzing files and encoding documents; the rest is transfer and queueing. */
  readonly analyzeMs: number;
  readonly encodeMs: number;
  readonly commitMs: number;
  readonly reasonMs: number;
  readonly totalMs: number;
};

export type Result = {
  readonly root: string;
  readonly scanned: number;
  readonly indexed: number;
  /** Files whose mtime moved but whose content did not: recorded without reindexing. */
  readonly touched: number;
  readonly unchanged: number;
  readonly removed: number;
  readonly skipped: readonly Protocol.SkippedFile[];
  /** Size of the derived graph after the pass, whether or not this pass recomputed it. */
  readonly derived: number;
  /** Whether the reasoners ran; they are skipped when their graphs are already current. */
  readonly reasoned: boolean;
  /** What each reasoner concluded, in the order they ran. */
  readonly reasoners: readonly Reasoner.Outcome[];
  readonly timings: Timings;
};

export const DEFAULT_BATCH_SIZE = 64;

export const DEFAULT_COMMIT_SIZE = 512;

const millis = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<[number, A], E, R> =>
  Effect.map(Effect.timed(effect), ([duration, value]) => [Duration.toMillis(duration), value]);

/**
 * `run` is exported, so `batchSize` arrives from outside: zero would leave the batching loop's
 * index unchanged and a negative one would walk away from the end, in both cases forever.
 */
const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`batchSize must be a positive integer, got ${size}`);
  }
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

/**
 * The mtime to record for a file whose content still hashes to `hash`, or `undefined` if it changed
 * (or cannot be read, which the worker then reports). Stat before read, as the worker does: a write
 * racing the two leaves the recorded mtime older than the file's, so the next pass looks again.
 */
const touchedAt = (absolute: string, hash: string): Effect.Effect<number | undefined> =>
  Effect.tryPromise(async () => {
    const stats = await stat(absolute);
    const source = await readFile(absolute, 'utf8');
    return contentHash(source) === hash ? Math.floor(stats.mtimeMs) : undefined;
  }).pipe(Effect.orElseSucceed(() => undefined));

/** A rule reading `deus:mtime` would go stale on a touch, which does not advance the generation. */
const readsMtime = (reasoners: readonly Reasoner.Reasoner[]): boolean =>
  reasoners.some((reasoner) => 'rules' in reasoner && reasoner.rules.includes('mtime'));

/** Index `root` into the ambient {@link Store.Store}, reusing everything whose mtime or content is unchanged. */
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
    const commitSize = options.commitSize ?? DEFAULT_COMMIT_SIZE;

    const started = Date.now();
    const reasoners = options.reasoners ?? [];
    const [scanMs, { entries, changed, touches, removed }] = yield* millis(
      Effect.gen(function* () {
        const entries = yield* Crawler.crawl(root, { extensions: options.extensions });
        const states = yield* store.fileStates();
        const recorded = new Map(states.map((state) => [state.path, state]));
        const present = new Set(entries.map((entry) => entry.path));
        const moved = entries.filter((entry) => options.force || recorded.get(entry.path)?.mtime !== entry.mtime);
        // A checkout or `touch` moves mtimes without changing content; hashing here is far cheaper
        // than reparsing, and keeps the reasoners from rerunning over facts that did not change.
        const hashed =
          options.force || readsMtime(reasoners)
            ? moved.map(() => undefined)
            : yield* Effect.forEach(
                moved,
                (entry) => {
                  const state = recorded.get(entry.path);
                  return state ? touchedAt(join(root, entry.path), state.hash) : Effect.succeed(undefined);
                },
                { concurrency: 16 },
              );
        const touches: Store.FileTouch[] = [];
        const changed: Crawler.Entry[] = [];
        moved.forEach((entry, index) => {
          const mtime = hashed[index];
          if (mtime === undefined) {
            changed.push(entry);
          } else {
            touches.push({ path: entry.path, mtime });
          }
        });
        return { entries, changed, touches, removed: states.filter((state) => !present.has(state.path)) };
      }),
    );

    let commitMs = 0;
    const [removalMs] = yield* millis(
      Effect.forEach(removed, (state) => store.removeFile(state.path), { discard: true }),
    );
    commitMs += removalMs;
    const [touchMs] = yield* millis(store.touchFiles(touches));
    commitMs += touchMs;

    const skipped: Protocol.SkippedFile[] = [];
    let parseMs = 0;
    let analyzeMs = 0;
    let encodeMs = 0;
    let indexed = 0;
    const pending: Store.EncodedDocument[] = [];
    const commit = () =>
      Effect.gen(function* () {
        const documents = pending.splice(0);
        const [batchCommitMs] = yield* millis(store.putDocuments(documents));
        commitMs += batchCommitMs;
        indexed += documents.length;
      });

    if (changed.length > 0) {
      const batches = chunk(changed, batchSize);
      // A worker costs its startup whether or not it gets a batch, which dominates a small pass.
      const poolSize = Math.min(workers, batches.length);
      const client = yield* Pool.make(poolSize);
      yield* Effect.forEach(
        batches,
        (batch) =>
          Effect.gen(function* () {
            const [batchParseMs, response] = yield* millis(client.AnalyzeBatch({ root, files: batch }));
            parseMs += batchParseMs;
            analyzeMs += response.analyzeMs;
            encodeMs += response.encodeMs;
            skipped.push(...response.skipped);
            pending.push(...response.analyzed);
            // Documents are committed several batches at a time: one write of the quad store per
            // commit is what dominates, and it costs less per quad the more it carries. An
            // interruption costs at most the commit in flight, which the next pass reindexes.
            if (pending.length >= commitSize) {
              yield* commit();
            }
          }),
        { concurrency: poolSize, discard: true },
      );
      yield* commit();
    }

    yield* store.setMeta('root', root);
    yield* store.setMeta('indexedAt', new Date().toISOString());

    // Reasoning closes the pass: each reasoner's graph is recomputed from the facts this pass left
    // behind, so a conclusion can never outlive the import or file that entailed it. It is skipped
    // only when the store records that these rules already ran over exactly these facts — not when
    // this pass changed nothing, which would strand a pass run with `--no-reason` or interrupted
    // before reasoning, reporting stale conclusions until some file changed.
    const current = reasoners.length > 0 ? yield* store.reasoned(Reasoner.signature(reasoners)) : undefined;
    const willReason = reasoners.length > 0 && current === undefined;
    const [reasonMs, outcomes] = yield* millis(willReason ? Reasoner.run(reasoners) : Effect.succeed([]));
    const derived = willReason
      ? outcomes.reduce((total, outcome) => total + outcome.derived, 0)
      : (current ?? (yield* store.derivedCount()));

    return {
      root,
      scanned: entries.length,
      indexed,
      touched: touches.length,
      unchanged: entries.length - changed.length - touches.length,
      removed: removed.length,
      skipped,
      derived,
      reasoned: willReason,
      reasoners: outcomes,
      timings: { scanMs, parseMs, analyzeMs, encodeMs, commitMs, reasonMs, totalMs: Date.now() - started },
    };
  });
