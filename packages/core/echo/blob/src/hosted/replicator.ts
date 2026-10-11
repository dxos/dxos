//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Queue from 'effect/Queue';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import { type BlobStore, type BlobTransport, type LocalBlob, type LocalBlobStore } from '../backend.ts';

const UPLOAD_BATCH_SIZE = 8;
const DEFAULT_RETRY_BASE_DELAY = 1_000;
const DEFAULT_RETRY_MAX_DELAY = 5 * 60_000;

export interface CreateBlobReplicatorOptions {
  local: LocalBlobStore;
  transport: BlobTransport;
  /** Retry backoff, in milliseconds. */
  retry?: { baseDelay?: number; maxDelay?: number };
}

/** Pushes the blobs in a {@link LocalBlobStore}'s ledger to the hosted store. */
export interface BlobReplicator {
  /** Signals that new blobs may be pending; cheap, and never waits on the network. */
  wake(): void;
  /**
   * Uploads every pending blob now, resolving once none remain and rejecting on the first failure.
   * Safe alongside the background loop: uploads are content-addressed, so a duplicate is a no-op.
   */
  flush(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Asynchronously replicates locally stored blobs to the hosted store. It drains the ledger, then
 * sleeps until {@link BlobReplicator.wake}; a failed pass retries with jittered exponential backoff.
 * Writers never wait on it: a blob is durable once the local store holds it, and the ledger carries
 * anything not yet uploaded across restarts.
 */
export const createBlobReplicator = ({ local, transport, retry }: CreateBlobReplicatorOptions): BlobReplicator => {
  const baseDelay = retry?.baseDelay ?? DEFAULT_RETRY_BASE_DELAY;
  const maxDelay = retry?.maxDelay ?? DEFAULT_RETRY_MAX_DELAY;
  // Capacity one, sliding: a burst of writes collapses into one pending pass over the ledger.
  const wake = Effect.runSync(Queue.sliding<void>(1));
  const fiber = Effect.runFork(replicationLoop({ local, transport, wake, baseDelay, maxDelay }));

  return {
    wake: () => {
      Queue.offerUnsafe(wake, undefined);
    },
    flush: () => EffectEx.runPromise(uploadPending(local, transport)),
    close: () => EffectEx.runPromise(Fiber.interrupt(fiber)),
  };
};

/**
 * A {@link BlobStore} that fills local misses from the hosted store and caches them as already
 * uploaded, so they are never sent back.
 */
export const withReadThrough = ({
  local,
  transport,
}: {
  local: LocalBlobStore;
  transport: BlobTransport;
}): BlobStore => {
  // Shared so concurrent reads of one cold key fetch it once.
  const inflight = new Map<string, Promise<LocalBlob | undefined>>();

  const fetchAndCache = async (key: string): Promise<LocalBlob | undefined> => {
    const data = await transport.get(key);
    if (data === undefined) {
      return undefined;
    }
    try {
      await local.put(key, data, { uploaded: true });
    } catch (error) {
      // The bytes are in hand, so a failed cache write costs the next read a refetch, not this one.
      log.warn('failed to cache blob locally', { key, error });
    }
    return { data };
  };

  return {
    put: (key, data, options) => local.put(key, data, options),

    get: async (key) => {
      const stored = await local.get(key);
      if (stored) {
        return stored;
      }
      let pending = inflight.get(key);
      if (!pending) {
        pending = fetchAndCache(key).finally(() => inflight.delete(key));
        inflight.set(key, pending);
      }
      return pending;
    },

    has: async (key) => (await local.has(key)) || transport.has(key),
  };
};

/** Uploads pending blobs until the ledger is empty; fails on the first blob that does not upload. */
const uploadPending: (local: LocalBlobStore, transport: BlobTransport) => Effect.Effect<void, Cause.UnknownError> =
  Effect.fnUntraced(function* (local, transport) {
    for (;;) {
      const keys = yield* Effect.tryPromise(() => local.listPending({ limit: UPLOAD_BATCH_SIZE }));
      if (keys.length === 0) {
        return;
      }
      for (const key of keys) {
        const blob = yield* Effect.tryPromise(() => local.get(key));
        if (blob) {
          yield* Effect.tryPromise(() => transport.put(key, blob.data, { contentType: blob.contentType }));
        }
        // Marked even when the bytes are gone, or the entry would head the ledger forever.
        yield* Effect.tryPromise(() => local.markUploaded(key));
      }
    }
  });

const replicationLoop: (options: {
  local: LocalBlobStore;
  transport: BlobTransport;
  wake: Queue.Queue<void>;
  baseDelay: number;
  maxDelay: number;
}) => Effect.Effect<never> = Effect.fnUntraced(function* ({ local, transport, wake, baseDelay, maxDelay }) {
  let failures = 0;
  for (;;) {
    const exit = yield* Effect.exit(uploadPending(local, transport));
    if (Exit.isSuccess(exit)) {
      failures = 0;
      yield* Queue.take(wake);
      continue;
    }

    failures++;
    const delay = Math.min(baseDelay * 2 ** (failures - 1), maxDelay);
    log.info('blob replication failed; retrying', { failures, delay, error: Cause.squash(exit.cause) });
    // Jittered within the upper half of the delay, so clients that went offline together do not retry together.
    yield* Effect.sleep(delay / 2 + Math.random() * (delay / 2));
  }
});
