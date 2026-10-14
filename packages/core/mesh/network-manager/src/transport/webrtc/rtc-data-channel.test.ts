//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { bindDataChannel } from './rtc-data-channel.ts';

/**
 * The binding is driven entirely by the channel's events, and a transferred channel does not
 * deliver them in the order the creating context would have seen: it can arrive already open, and
 * its first message can beat the `open` event. Both cases dropped the frame before, which stalled
 * the wire protocol's handshake.
 */
describe('bindDataChannel', () => {
  test('delivers a message that arrives before the open event', async () => {
    const { channel, stream, received } = setup({ readyState: 'connecting' });
    const dispose = bindDataChannel(channel as any, stream, handlers());

    channel.onmessage!({ data: new TextEncoder().encode('first frame') } as any);
    channel.readyState = 'open';
    channel.onopen!({} as any);

    expect(await received).toBe('first frame');
    dispose();
  });

  test('binds a channel that is already open when handed over', async () => {
    const { channel, stream, received } = setup({ readyState: 'open' });
    const dispose = bindDataChannel(channel as any, stream, handlers());

    // No `onopen` ever fires for a channel transferred after it opened.
    channel.onmessage!({ data: new TextEncoder().encode('late handover') } as any);

    expect(await received).toBe('late handover');
    dispose();
  });

  test('does not send before the channel opens', async () => {
    // `send` throws while the channel is `connecting`. The non-initiator hits this: its channel is
    // transferred straight out of `ondatachannel`, and the peer's first frame can arrive before the
    // open event — piping the wire protocol in at that point tore the whole connection down.
    const sent: string[] = [];
    const { channel, stream, received } = setup({
      readyState: 'connecting',
      onSend: (chunk) => {
        expect(channel.readyState, 'sent while the channel was not open').toBe('open');
        sent.push(new TextDecoder().decode(chunk));
      },
    });
    const dispose = bindDataChannel(channel as any, stream, handlers());

    channel.onmessage!({ data: new TextEncoder().encode('inbound first') } as any);
    stream.push('outbound while connecting');

    // The inbound frame still lands; nothing goes out yet.
    expect(await received).toBe('inbound first');
    expect(sent).toEqual([]);

    channel.readyState = 'open';
    channel.onopen!({} as any);
    await expect.poll(() => sent).toEqual(['outbound while connecting']);
    dispose();
  });

  test('reports the channel as open only once', async () => {
    const { channel, stream } = setup({ readyState: 'connecting' });
    let opened = 0;
    const dispose = bindDataChannel(channel as any, stream, { ...handlers(), onOpen: () => void opened++ });

    channel.onmessage!({ data: new TextEncoder().encode('x') } as any);
    channel.readyState = 'open';
    channel.onopen!({} as any);
    channel.onopen!({} as any);

    expect(opened).toBe(1);
    dispose();
  });

  test('delivers a blob frame and the frame after it in arrival order', async () => {
    const { channel } = setup({ readyState: 'open' });
    const received: string[] = [];
    const decoder = new TextDecoder();
    const stream = {
      readable: new ReadableStream<Uint8Array>(),
      writable: new WritableStream<Uint8Array>({
        write: (chunk) => {
          received.push(decoder.decode(chunk));
        },
      }),
    };
    const dispose = bindDataChannel(channel as any, stream, handlers());

    channel.onmessage!({ data: new Blob(['first']) } as any);
    channel.onmessage!({ data: new TextEncoder().encode('second').buffer } as any);

    await expect.poll(() => received).toEqual(['first', 'second']);
    dispose();
  });

  test('drops a blob still being read when the channel is disposed', async () => {
    const { channel, stream } = setup({ readyState: 'open' });
    const dispose = bindDataChannel(channel as any, stream, handlers());

    // `Blob.arrayBuffer` is the one await on the inbound path; disposal during it leaves nothing
    // to push to, and pushing anyway threw.
    let release: ((value: ArrayBuffer) => void) | undefined;
    const blob = { arrayBuffer: () => new Promise<ArrayBuffer>((resolve) => (release = resolve)) };
    Object.setPrototypeOf(blob, Blob.prototype);
    const delivered = channel.onmessage!({ data: blob } as any) as unknown as Promise<void>;
    await expect.poll(() => release).toBeDefined();

    dispose();
    release!(new Uint8Array([1, 2, 3]).buffer);
    await expect(delivered).resolves.toBeUndefined();
  });

  test('sends what the wire-protocol stream writes', async () => {
    const sent: string[] = [];
    const { channel, stream } = setup({
      readyState: 'open',
      onSend: (chunk) => sent.push(new TextDecoder().decode(chunk)),
    });
    const dispose = bindDataChannel(channel as any, stream, handlers());

    stream.push('outbound');
    await expect.poll(() => sent).toEqual(['outbound']);
    dispose();
  });
});

const handlers = () => ({ onOpen: () => {}, onClose: () => {}, onError: (error: Error) => expect.fail(error.message) });

/** A duplex standing in for the wire protocol, plus the minimum of `RTCDataChannel` the binding uses. */
const setup = ({ readyState, onSend }: { readyState: string; onSend?: (chunk: Uint8Array) => void }) => {
  let resolveReceived: (value: string) => void;
  const received = new Promise<string>((resolve) => (resolveReceived = resolve));

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = {
    readable: new ReadableStream<Uint8Array>({
      start: (ctrl) => {
        controller = ctrl;
      },
    }),
    writable: new WritableStream<Uint8Array>({
      write: (chunk) => {
        resolveReceived(decoder.decode(chunk));
      },
    }),
    push: (data: string) => controller.enqueue(encoder.encode(data)),
  };

  const channel = {
    readyState,
    bufferedAmount: 0,
    send: (chunk: Uint8Array) => onSend?.(chunk),
    close: () => {},
    onopen: undefined as ((event: Event) => void) | undefined,
    onclose: undefined as ((event: Event) => void) | undefined,
    onmessage: undefined as ((event: MessageEvent) => void) | undefined,
    onerror: undefined as ((event: Event) => void) | undefined,
    onbufferedamountlow: undefined as ((event: Event) => void) | undefined,
  };

  return { channel, stream, received };
};
