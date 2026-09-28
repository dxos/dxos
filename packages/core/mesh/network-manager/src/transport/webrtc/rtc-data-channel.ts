//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { type TransportOptions } from '../transport.ts';

// https://viblast.com/blog/2015/2/5/webrtc-data-channel-message-size
const MAX_MESSAGE_SIZE = 64 * 1024;
// Bytes the channel may hold before we stop accepting writes; the real backpressure signal.
const MAX_BUFFERED_AMOUNT = 64 * 1024;

export type DataChannelHandlers = {
  /** The channel is usable; the wire-protocol stream is now piped through it. */
  onOpen: () => void;
  /** Awaited by the channel's `onclose`, so a consumer can settle its teardown before it returns. */
  onClose: () => Promise<void> | void;
  onError: (error: Error) => void;
};

/**
 * Pipes an `RTCDataChannel` to the wire-protocol stream, using the channel's own send buffer as the
 * stream's backpressure signal.
 *
 * Whoever holds the channel object runs this — the tab for a direct transport, the worker for a
 * proxied one after the channel has been transferred to it. The channel may still be connecting.
 *
 * @returns A disposer that detaches from the stream and closes the channel.
 */
export const bindDataChannel = (
  channel: RTCDataChannel,
  stream: TransportOptions['stream'],
  { onOpen, onClose, onError }: DataChannelHandlers,
): (() => void) => {
  let inbound: ReadableStreamDefaultController<Uint8Array> | undefined;
  /** Whether the wire protocol has been piped into the channel, which only happens once it opens. */
  let writable = false;
  // Held while the channel's send buffer is above the watermark, released by `onbufferedamountlow`.
  let flushed: (() => void) | null = null;
  let disposed = false;
  // Frames convert one after another, so a blob's asynchronous read cannot let a later frame land first.
  let frameOrder = Promise.resolve();
  // Detach each direction without ending the wire-protocol stream, which outlives this channel.
  const inboundAbort = new AbortController();
  const outboundAbort = new AbortController();

  const write = async (chunk: Uint8Array): Promise<void> => {
    if (chunk.length > MAX_MESSAGE_SIZE) {
      onError(new Error(`Message too large: ${chunk.length} > ${MAX_MESSAGE_SIZE}.`));
      return;
    }

    try {
      // `send` demands an ArrayBuffer-backed view; re-wrapping is free unless the chunk is
      // SharedArrayBuffer-backed, which this pipeline never produces.
      channel.send(
        chunk.buffer instanceof ArrayBuffer
          ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
          : new Uint8Array(chunk),
      );
    } catch (err: any) {
      onError(err);
      return;
    }

    if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      if (flushed !== null) {
        log.error('consumer trying to write before we are ready for more data');
      }
      await new Promise<void>((resolve) => {
        flushed = resolve;
      });
    }
  };

  /**
   * The two directions become available at different moments on a transferred channel, so they are
   * attached separately.
   *
   * Inbound: a message can be dispatched before this context sees the `open` event, and dropping
   * that first frame stalls the wire protocol's handshake for good — so reading starts on whichever
   * of the two arrives first.
   */
  const attachInbound = () => {
    if (inbound || disposed) {
      return;
    }

    const readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        inbound = controller;
      },
    });
    // `preventClose`/`preventAbort`: detaching this channel must not end the wire-protocol stream.
    void readable
      .pipeTo(stream.writable, { signal: inboundAbort.signal, preventClose: true, preventAbort: true })
      .catch(() => {});
  };

  /**
   * Outbound: `send` throws while the channel is still `connecting`, so the wire protocol is not
   * piped into it — and the transport does not report itself connected — until it is really open.
   */
  const attachOutbound = () => {
    if (writable || disposed) {
      return;
    }

    attachInbound();
    writable = true;
    log('channel open');
    const sink = new WritableStream<Uint8Array>({ write: (chunk) => write(chunk) });
    // `preventCancel`: the wire-protocol readable outlives this channel.
    void stream.readable.pipeTo(sink, { signal: outboundAbort.signal, preventCancel: true }).catch(() => {});
    onOpen();
  };

  channel.binaryType = 'arraybuffer';
  Object.assign<RTCDataChannel, Partial<RTCDataChannel>>(channel, {
    onopen: () => attachOutbound(),

    onclose: () => (disposed ? undefined : onClose()),

    onmessage: (event: MessageEvent) => {
      attachInbound();
      if (!inbound) {
        log.warn('ignoring message on a closed channel');
        return;
      }

      const data = event.data;
      frameOrder = frameOrder.then(async () => {
        const frame =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : data instanceof Blob
              ? new Uint8Array(await data.arrayBuffer())
              : data;
        // Re-read after the read: disposal in the meantime leaves nothing to push to.
        inbound?.enqueue(frame);
      });
      return frameOrder;
    },

    onerror: (event: Event & any) => {
      if (!disposed) {
        onError(event.error instanceof Error ? event.error : new Error(`Datachannel error: ${event.type}.`));
      }
    },

    onbufferedamountlow: () => {
      const callback = flushed;
      flushed = null;
      callback?.();
    },
  });

  // A channel transferred after it opened has already dispatched its `open` event elsewhere, so
  // waiting for one here would wait forever.
  if (channel.readyState === 'open') {
    attachOutbound();
  }

  return () => {
    disposed = true;
    // Release a writer parked on the watermark, otherwise the pipe never unwinds.
    flushed?.();
    flushed = null;
    if (inbound) {
      // Both pipe directions have to go: the wire-protocol stream outlives this channel, and a
      // chunk it writes afterwards would otherwise reach `send` on a closed channel.
      inboundAbort.abort();
      outboundAbort.abort();
      inbound = undefined;
      writable = false;
    }
    try {
      channel.close();
    } catch (err: any) {
      log.catch(err);
    }
  };
};
