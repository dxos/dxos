//
// Copyright 2026 DXOS.org
//

/**
 * A bidirectional byte pipe, expressed with WHATWG streams.
 *
 * `readable` carries bytes produced by the owner; `writable` accepts bytes destined for it.
 * Replaces the Node `Duplex` that used to wire transports to the muxer, so that nothing below
 * the hypercore bridge pulls `readable-stream` into a browser bundle.
 */
export type DuplexStream<T = Uint8Array> = {
  readable: ReadableStream<T>;
  writable: WritableStream<T>;
};

/**
 * Cross-connect two duplex streams, so that each one's output is the other's input.
 * The equivalent of `a.pipe(b).pipe(a)` on Node streams.
 *
 * Errors are reported rather than thrown: `pipeTo` rejects when either side is aborted, which is
 * the normal way a connection ends.
 *
 * Returns a detach that stops both directions and resolves once they have unwound. Cancelling a
 * readable instead would fail while `pipeTo` holds its lock, and would end streams that outlive
 * the connection.
 */
export const connectDuplexStreams = <T>(
  first: DuplexStream<T>,
  second: DuplexStream<T>,
  onError?: (err: Error) => void,
): (() => Promise<void>) => {
  const report = (err: unknown) => onError?.(err instanceof Error ? err : new Error(String(err)));
  const abort = new AbortController();
  // The endpoints outlive the connection, so neither is closed, aborted or cancelled with it.
  const detach = { signal: abort.signal, preventClose: true, preventAbort: true, preventCancel: true };
  const pipes = [
    first.readable.pipeTo(second.writable, detach).catch(report),
    second.readable.pipeTo(first.writable, detach).catch(report),
  ];

  return async () => {
    abort.abort();
    await Promise.allSettled(pipes);
  };
};

/**
 * Reads a readable to completion, invoking `onChunk` for each chunk.
 *
 * Used in place of `for await (… of readable)`, which the DOM `ReadableStream` lib type does not
 * declare an async iterator for.
 */
export const readAll = async <T>(
  readable: ReadableStream<T>,
  onChunk: (chunk: T) => void,
  { signal }: { signal?: AbortSignal } = {},
): Promise<void> => {
  const reader = readable.getReader();
  // Cancelling through the reader is the only way out while this loop holds the lock.
  const onAbort = () => void reader.cancel().catch(() => {});
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) {
    onAbort();
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      if (value) {
        onChunk(value);
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    // Otherwise the caller can never re-read, cancel or pipe the stream after this returns.
    reader.releaseLock();
  }
};
