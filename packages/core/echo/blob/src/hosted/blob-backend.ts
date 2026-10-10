//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Queue from 'effect/Queue';

import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type BlobBackend, type BlobTransport, type LocalBlob, type LocalBlobStore } from '../backend.ts';
import { SCHEME, digestHex, fromDigestHex } from '../ni-uri.ts';

export interface CreateEdgeBlobBackendOptions {
  /** Where every write lands first and every read looks first. */
  local: LocalBlobStore;
  /** The hosted store; absent when no EDGE endpoint is configured, which makes the backend local-only. */
  transport?: BlobTransport;
  /** Upload retry backoff, in milliseconds. */
  retry?: { baseDelay?: number; maxDelay?: number };
}

/** {@link BlobBackend} with the lifecycle of its background uploader. */
export interface EdgeBlobBackend extends BlobBackend {
  /** Always present: local bytes can be rendered without the network. */
  getUrl: NonNullable<BlobBackend['getUrl']>;
  /**
   * Uploads every pending blob now, resolving once none remain and rejecting on the first failure.
   * Safe alongside the background uploader: uploads are content-addressed, so a duplicate is a no-op.
   */
  flush(): Promise<void>;
  /** Stops the background uploader and revokes the object URLs `getUrl` handed out. */
  close(): Promise<void>;
}

// `SCHEME` from `ni-uri` rather than `Blob.Scheme.ni` from `@dxos/echo`: both are the string `ni`,
// and taking it from here is what keeps this package below `@dxos/echo` in the graph. `@dxos/echo`
// exposes `registerBlobBackend(…: BlobBackend)`, so anything it depends on cannot depend back on it.
const parseNiUri = (uri: string): string => {
  invariant(uri.startsWith(`${SCHEME}:///`), `Invalid ni: URI: ${uri}`);
  return digestHex(uri);
};

/** Largest blob the edge blob service accepts, in bytes. */
export const MAX_EDGE_BLOB_SIZE = 50 * 1024 * 1024;

const UPLOAD_BATCH_SIZE = 8;
const DEFAULT_RETRY_BASE_DELAY = 1_000;
const DEFAULT_RETRY_MAX_DELAY = 5 * 60_000;

/**
 * Local-first blob backend addressed by RFC 6920 `ni:` URIs over a SHA-256 digest of the complete
 * blob.
 *
 * Writes land in the {@link LocalBlobStore} and return immediately; a background uploader then
 * copies them to the edge blob service (a flat key-value store keyed by hex digest) with
 * exponential backoff, so a write never waits on, or fails because of, the network. Reads are served
 * locally, falling back to the edge on a miss and caching what it returns. Without a transport the
 * backend is local-only, and its writes stay pending until a session that has one uploads them.
 *
 * The local store only grows: nothing evicts an entry, because content-addressed bytes may be shared
 * by several `Blob` objects and `BlobBackend` has no `remove` or reference count to say when the last
 * one is gone.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc6920 RFC 6920}
 */
export const createEdgeBlobBackend = ({ local, transport, retry }: CreateEdgeBlobBackendOptions): EdgeBlobBackend => {
  const baseDelay = retry?.baseDelay ?? DEFAULT_RETRY_BASE_DELAY;
  const maxDelay = retry?.maxDelay ?? DEFAULT_RETRY_MAX_DELAY;

  // Bound once here rather than re-read inside the closure: the capability check and the call then
  // share one proof that the method exists, and `bind` keeps a method-style transport working.
  const finalizeUpload = transport?.finalizeUpload?.bind(transport);

  // Capacity one, sliding: a burst of writes collapses into one pending pass over the ledger.
  const wake = Effect.runSync(Queue.sliding<void>(1));
  const uploader = transport && Effect.runFork(uploadLoop({ local, transport, wake, baseDelay, maxDelay }));

  const objectUrls = new Map<string, string>();
  // Shared so a `get` and a `getUrl` racing on one cold key fetch it from the edge once.
  const inflight = new Map<string, Promise<LocalBlob | undefined>>();

  const fetchAndCache = async (key: string): Promise<LocalBlob | undefined> => {
    if (!transport) {
      return undefined;
    }
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

  const readThrough = async (key: string): Promise<LocalBlob | undefined> => {
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
  };

  return {
    schemes: [SCHEME],
    maxSize: MAX_EDGE_BLOB_SIZE,

    put: async ({ data, contentType, contentHash }) => {
      await local.put(contentHash, data, { contentType, uploaded: false });
      Queue.offerUnsafe(wake, undefined);
      return { uri: fromDigestHex(contentHash) };
    },

    get: async ({ uri }) => (await readThrough(parseNiUri(uri)))?.data,

    has: async ({ uri }) => {
      const key = parseNiUri(uri);
      return (await local.has(key)) || ((await transport?.has(key)) ?? false);
    },

    getUrl: async ({ uri, contentType }) => {
      const key = parseNiUri(uri);
      const existing = objectUrls.get(key);
      if (existing) {
        return existing;
      }

      let blob: LocalBlob | undefined;
      try {
        blob = await readThrough(key);
      } catch (error) {
        // The edge could not be read from here (offline, or a fetch the browser would still allow
        // as a subresource); its own URL is the only remaining way the bytes might render.
        log.info('blob unavailable locally; falling back to the edge URL', { key, error });
        return transport?.url(key).toString();
      }
      if (!blob) {
        return undefined;
      }

      const url = URL.createObjectURL(
        new Blob([new Uint8Array(blob.data)], { type: contentType ?? blob.contentType ?? '' }),
      );
      objectUrls.set(key, url);
      return url;
    },

    // Spread rather than always present: `adoptUpload` being absent is how the manager tells a
    // backend that cannot adopt uploads from an adoption that failed.
    ...(finalizeUpload && {
      adoptUpload: async ({ uploadId }: { uploadId: string }) => {
        // Not copied locally here: the bytes were uploaded straight to the edge, and the first read
        // caches them.
        const { key, size, contentType } = await finalizeUpload(uploadId);
        return { uri: fromDigestHex(key), size, contentType };
      },
    }),

    flush: async () => {
      if (transport) {
        await EffectEx.runPromise(uploadPending(local, transport));
      }
    },

    close: async () => {
      if (uploader) {
        await EffectEx.runPromise(Fiber.interrupt(uploader));
      }
      for (const url of objectUrls.values()) {
        URL.revokeObjectURL(url);
      }
      objectUrls.clear();
    },
  };
};

/** Uploads pending blobs until the ledger is empty; fails on the first blob that does not upload. */
const uploadPending = (local: LocalBlobStore, transport: BlobTransport): Effect.Effect<void, Cause.UnknownError> =>
  Effect.gen(function* () {
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

/**
 * Drains the ledger, then sleeps until a write wakes it; a failed pass retries with jittered
 * exponential backoff. Runs for the backend's lifetime and ends only by interruption.
 */
const uploadLoop = ({
  local,
  transport,
  wake,
  baseDelay,
  maxDelay,
}: {
  local: LocalBlobStore;
  transport: BlobTransport;
  wake: Queue.Queue<void>;
  baseDelay: number;
  maxDelay: number;
}): Effect.Effect<never> =>
  Effect.gen(function* () {
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
      log.info('blob upload failed; retrying', { failures, delay, error: Cause.squash(exit.cause) });
      // Jittered within the upper half of the delay, so clients that went offline together do not retry together.
      yield* Effect.sleep(delay / 2 + Math.random() * (delay / 2));
    }
  });
