//
// Copyright 2020 DXOS.org
//

import { Duplex } from 'node:stream';

import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';

import { type TransportOptions } from '../transport';

import { type RtcPeerConnection } from './rtc-peer-connection';
import { RtcTransportChannel } from './rtc-transport-channel';
import { handleChannelErrors } from './test-utils';

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
    controller.channel.onopen();
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
        controller.channel.onopen();
      } else {
        setTimeout(() => controller.channel.onopen());
      }
      await sleep(10);
      expect(controller.channel.wasClosed()).to.be.true;
    }
  });

  test('channel close closes transport', async () => {
    const controller = createChannelController();
    const { transport } = createTransport(controller.connection);
    const transportClosedEvent = handleClose(transport);
    await transport.open();
    await controller.onChannelCreated();
    controller.channel.onopen();
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
    controller.channel.onopen();
    expect(controller.channel.wasClosed()).to.be.true;
  });

  test('message not delivered on a closed transport', async () => {
    const controller = createChannelController();
    const { deliveredMessages, transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    controller.channel.onopen();
    const message = 'hello';
    await controller.channel.onMessage(message);
    expect(deliveredMessages).toStrictEqual([message]);
    await transport.close();
    await controller.channel.onMessage(message + '1');
    expect(deliveredMessages).toStrictEqual([message]);
  });

  test('message not sent on a closed transport', async () => {
    const controller = createChannelController();
    const { deliveredMessages, transport } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    controller.channel.onopen();
    const message = 'hello';
    await controller.channel.onMessage(message);
    expect(deliveredMessages).toStrictEqual([message]);
    await transport.close();
    await controller.channel.onMessage(message + '1');
    expect(deliveredMessages).toStrictEqual([message]);
  });

  test('error raised if send fails', async () => {
    const controller = createChannelController();
    const { transport, stream } = createTransport(controller.connection);
    await transport.open();
    await controller.onChannelCreated();
    const transportClosedEvent = handleChannelErrors(transport);
    controller.channel.onopen();
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
      onopen: () => {},
      onclose: async () => {},
      close: () => (closed = true),
      send: () => {
        if (failsSending) {
          throw new Error('Expected');
        }
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
      onChannelCreated,
      onChannelCreationFailed,
      setFailSending: (fail: boolean) => {
        failsSending = fail;
      },
      channel,
      connection: {
        createDataChannel: async (topic: string) => createChannelPromise,
      } as any as RtcPeerConnection,
    };
  };
});
