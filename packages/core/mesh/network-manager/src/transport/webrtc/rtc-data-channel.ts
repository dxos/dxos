//
// Copyright 2026 DXOS.org
//

import { Duplex } from 'node:stream';

import { log } from '@dxos/log';

import { type TransportOptions } from '../transport.ts';

// https://viblast.com/blog/2015/2/5/webrtc-data-channel-message-size
const MAX_MESSAGE_SIZE = 64 * 1024;
// The default Readable stream buffer size: https://nodejs.org/api/stream.html#implementing-a-readable-stream
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
  let duplex: Duplex | undefined;
  // Held while the channel's send buffer is above the watermark, released by `onbufferedamountlow`.
  let flushed: (() => void) | null = null;
  let disposed = false;

  const write = (chunk: any, callback: () => void): void => {
    if (chunk.length > MAX_MESSAGE_SIZE) {
      onError(new Error(`Message too large: ${chunk.length} > ${MAX_MESSAGE_SIZE}.`));
      callback();
      return;
    }

    try {
      channel.send(chunk);
    } catch (err: any) {
      onError(err);
      callback();
      return;
    }

    if (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      if (flushed !== null) {
        log.error('consumer trying to write before we are ready for more data');
      }
      flushed = callback;
    } else {
      callback();
    }
  };

  Object.assign<RTCDataChannel, Partial<RTCDataChannel>>(channel, {
    onopen: () => {
      if (disposed) {
        return;
      }

      log('onopen');
      duplex = new Duplex({
        read: () => {},
        write: (chunk, _encoding, callback) => write(chunk, callback),
      });
      duplex.pipe(stream).pipe(duplex);
      onOpen();
    },

    onclose: () => (disposed ? undefined : onClose()),

    onmessage: async (event: MessageEvent) => {
      if (!duplex) {
        log.warn('ignoring message on a closed channel');
        return;
      }

      let data = event.data;
      if (data instanceof ArrayBuffer) {
        data = Buffer.from(data);
      } else if (data instanceof Blob) {
        data = Buffer.from(await data.arrayBuffer());
      }
      duplex.push(data);
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

  return () => {
    disposed = true;
    // Release a writer parked on the watermark, otherwise the pipe never unwinds.
    flushed?.();
    flushed = null;
    if (duplex) {
      // Both pipe directions have to go: the wire-protocol stream outlives this channel, and a
      // chunk it writes afterwards would otherwise reach `send` on a closed channel.
      duplex.unpipe(stream);
      stream.unpipe(duplex);
      duplex.destroy();
      duplex = undefined;
    }
    try {
      channel.close();
    } catch (err: any) {
      log.catch(err);
    }
  };
};
