//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import type * as RpcClientError from 'effect/unstable/rpc/RpcClientError';
import type * as WorkerError from 'effect/unstable/workers/WorkerError';
import { realpath } from 'node:fs/promises';
import { availableParallelism } from 'node:os';

import * as Crawler from './Crawler.ts';
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
};

export type Result = {
  readonly root: string;
  readonly scanned: number;
  readonly indexed: number;
  readonly unchanged: number;
  readonly removed: number;
  readonly skipped: readonly Protocol.SkippedFile[];
};

export const DEFAULT_BATCH_SIZE = 64;

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

    const entries = yield* Crawler.crawl(root, { extensions: options.extensions });
    const states = yield* store.fileStates();
    const recorded = new Map(states.map((state) => [state.path, state.mtime]));
    const present = new Set(entries.map((entry) => entry.path));

    const changed = entries.filter((entry) => options.force || recorded.get(entry.path) !== entry.mtime);
    const removed = states.filter((state) => !present.has(state.path));
    yield* Effect.forEach(removed, (state) => store.removeFile(state.path), { discard: true });

    const skipped: Protocol.SkippedFile[] = [];
    let indexed = 0;

    if (changed.length > 0) {
      const client = yield* Pool.make(workers);
      yield* Effect.forEach(
        chunk(changed, batchSize),
        (batch) =>
          Effect.flatMap(client.AnalyzeBatch({ root, files: batch }), (response) =>
            Effect.gen(function* () {
              skipped.push(...response.skipped);
              // Documents are committed one file at a time: each is its own graph swap plus ledger
              // row, so an interruption costs at most the file in flight.
              for (const file of response.analyzed) {
                yield* store.putFileDocument(file.document);
                indexed++;
              }
            }),
          ),
        { concurrency: workers, discard: true },
      );
    }

    yield* store.setMeta('root', root);
    yield* store.setMeta('indexedAt', new Date().toISOString());

    return {
      root,
      scanned: entries.length,
      indexed,
      unchanged: entries.length - changed.length,
      removed: removed.length,
      skipped,
    };
  });
