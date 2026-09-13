//
// Copyright 2020 DXOS.org
//

import { Duplex } from 'node:stream';
import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';

import { type TransportOptions } from '../transport.ts';
import { type RtcPeerConnection } from './rtc-peer-connection.ts';
import { RtcTransportChannel } from './rtc-transport-channel.ts';
import { handleChannelErrors } from './test-utils.ts';

describe('RtcTransportChannel', () => {
  test('transport error raised if channel creation fails', async () => {
    const controller = createChannelController();
    const { transport } = createTransport(controller.connection);
    const transportErrors = handleChannelErrors(transport);
    await transport.open();
    controller.onChannelCreationFailed();
    await transportErrors.expectErrorRaised();
  });

  test('channel closed if it was open after transport was closed', async () => {
    const controller = createChannelController();
    const { transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    await transport.close();
    controller.open();
    expect(controller.channel.wasClosed()).to.be.true;
  });

  test('channel open while transport is being closed', async () => {
    for (const syncOpen of [false, true]) {
      const controller = createChannelController();
      const { transport } = createTransport(controller.connection);
      await transport.open();
      await controller.onChannelCreated();
      void transport.close();
      if (syncOpen) {
        controller.open();
      } else {
        setTimeout(() => controller.open());
      }
      // Poll until the channel observes the transport closing, regardless of open/close ordering.
      await expect.poll(() => controller.channel.wasClosed()).toBe(true);
    }
  });

  test('channel close closes transport', async () => {
    const controller = createChannelController();
    const { transport } = createTransport(controller.connection);
    const transportClosedEvent = handleClose(transport);
    await transport.open();
    await controller.onChannelCreated();
    controller.open();
    await sleep(10);
    await controller.channel.onclose();
    expect(transport.isOpen).to.be.false;
    await transportClosedEvent.expectWasEmitted();
  });

  test('channel closed if created after transport was closed', async () => {
    const controller = createChannelController();
    const { transport } = createTransport(controller.connection);
    await transport.open();
    await transport.close();
    await controller.onChannelCreated();
    controller.open();
    expect(controller.channel.wasClosed()).to.be.true;
  });

  test('message not delivered on a closed transport', async () => {
    const controller = createChannelController();
    const { deliveredMessages, transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    controller.open();
    const message = 'hello';
    await controller.channel.onMessage(message);
    expect(deliveredMessages).toStrictEqual([message]);
    await transport.close();
    await controller.channel.onMessage(message + '1');
    expect(deliveredMessages).toStrictEqual([message]);
  });

  // Nothing retransmits a frame delivered before the channel reports open.
  test('messages delivered before the channel opens arrive in order once it does', async () => {
    const controller = createChannelController();
    const { deliveredMessages, transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();

    await controller.channel.onMessage('first');
    await controller.channel.onMessage('second');
    expect(deliveredMessages).toStrictEqual([]);

    controller.open();
    await sleep(5);
    expect(deliveredMessages).toStrictEqual(['first', 'second']);
  });

  // A channel already open when the handlers are attached never dispatches `open`.
  test('a channel that is already open delivers messages', async () => {
    const controller = createChannelController();
    (controller.channel as any).readyState = 'open';
    const { deliveredMessages, transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();

    await controller.channel.onMessage('hello');
    expect(deliveredMessages).toStrictEqual(['hello']);
  });

  // A channel already open at attach time reaches the open path from both the check and the event.
  // Opening twice pipes the protocol stream into two channels, so every outgoing frame is sent twice.
  test('a channel open at attach time sends each frame once', async ({ expect }) => {
    const controller = createChannelController();
    (controller.channel as any).readyState = 'open';
    const { stream, transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    controller.open();

    stream.push('outgoing');
    await sleep(5);
    expect(controller.channel.sentMessages.map((message) => Buffer.from(message).toString())).toStrictEqual([
      'outgoing',
    ]);
  });

  test('message not sent on a closed transport', async () => {
    const controller = createChannelController();
    const { deliveredMessages, transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    controller.open();
    const message = 'hello';
    await controller.channel.onMessage(message);
    expect(deliveredMessages).toStrictEqual([message]);
    await transport.close();
    await controller.channel.onMessage(message + '1');
    expect(deliveredMessages).toStrictEqual([message]);
  });

  // A channel that has left `open` throws on `send`, and raising that tears the peer connection down
  // for bytes whose connection is already going away; `onclose` carries the close on its own.
  test('a write to a channel that is not open is dropped, not raised', async ({ expect }) => {
    const controller = createChannelController();
    const { transport, stream, deliveredMessages } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    const errors = handleChannelErrors(transport);
    controller.open();
    controller.channel.readyState = 'closing';

    stream.push('hello');
    await sleep(20);
    expect(controller.channel.sentMessages).toEqual([]);
    expect(deliveredMessages).toEqual([]);
    await errors.expectNoErrorRaised();
  });

  test('error raised if send fails', async () => {
    const controller = createChannelController();
    const { transport, stream } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    const transportClosedEvent = handleChannelErrors(transport);
    controller.open();
    controller.setFailSending(true);
    stream.push('hello');
    await transportClosedEvent.expectErrorRaised();
  });

  const createTransport = (connection: RtcPeerConnection) => {
    const deliveredMessages: any[] = [];
    const stream = new Duplex({
      read: () => {},
      write: (chunk: any, _: BufferEncoding, callback: (error?: Error | null) => void) => {
        deliveredMessages.push(Buffer.from(chunk).toString());
        callback();
      },
    });
    const options = { topic: 'test', stream } as any as TransportOptions;
    return { deliveredMessages, stream, transport: new RtcTransportChannel(connection, options) };
  };

  const handleClose = (channel: RtcTransportChannel) => {
    let emitted = false;
    channel.closed.on(() => {
      emitted = true;
    });
    return {
      expectWasEmitted: async () => expect(emitted).toBeTruthy(),
    };
  };

  const createChannelController = () => {
    // Lowercase methods will get overwritten internally.
    let closed = false;
    let failsSending = false;
    const channel = {
      // A real `RTCDataChannel` always reports one, and `send` throws outside `open`.
      readyState: 'connecting' as RTCDataChannelState,
      onopen: () => {},
      onclose: async () => {},
      close: () => {
        closed = true;
        channel.readyState = 'closed';
      },
      sentMessages: [] as any[],
      send: (message: any) => {
        if (failsSending) {
          throw new Error('Expected');
        }
        channel.sentMessages.push(message);
      },
      wasClosed: () => closed,
      onMessage: async (message: string) => {
        (channel as any).onmessage({ data: message });
        await sleep(5);
      },
    };
    let onChannelCreated = async () => {};
    let onChannelCreationFailed = () => {};
    const createChannelPromise = new Promise((resolve, reject) => {
      onChannelCreated = async () => {
        resolve(channel);
        await sleep(5);
      };
      onChannelCreationFailed = reject;
    });
    return {
      /** Mirrors the browser: the channel reports `open` before it fires `onopen`. */
      open: () => {
        channel.readyState = 'open';
        (channel as any).onopen();
      },
      onChannelCreated,
      onChannelCreationFailed,
      setFailSending: (fail: boolean) => {
        failsSending = fail;
      },
      channel,
      connection: {
        createDataChannel: async (topic: string) => {
          return createChannelPromise;
        },
      } as any as RtcPeerConnection,
    };
  };
});
