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
export type DuplexStream = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};

/**
 * Cross-connect two duplex streams, so that each one's output is the other's input.
 * The equivalent of `a.pipe(b).pipe(a)` on Node streams.
 *
 * Errors are reported rather than thrown: `pipeTo` rejects when either side is aborted, which is
 * the normal way a connection ends.
 */
export const connectDuplexStreams = (
  first: DuplexStream,
  second: DuplexStream,
  onError?: (err: Error) => void,
): void => {
  const report = (err: unknown) => onError?.(err instanceof Error ? err : new Error(String(err)));
  void first.readable.pipeTo(second.writable).catch(report);
  void second.readable.pipeTo(first.writable).catch(report);
};

/**
 * Reads a readable to completion, invoking `onChunk` for each chunk.
 *
 * Used in place of `for await (… of readable)`, which the DOM `ReadableStream` lib type does not
 * declare an async iterator for.
 */
export const readAll = async (
  readable: ReadableStream<Uint8Array>,
  onChunk: (chunk: Uint8Array) => void,
): Promise<void> => {
  const reader = readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return;
    }
    if (value) {
      onChunk(value);
    }
  }
};
