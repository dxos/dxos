//
// Copyright 2020 DXOS.org
//

import crypto from 'crypto';
import debug from 'debug';
import expect from 'expect';
import pump from 'pump';

import { sleep } from '@dxos/async';

import { ERR_EXTENSION_RESPONSE_FAILED, ERR_EXTENSION_RESPONSE_TIMEOUT } from './errors';
import { Extension } from './extension';
import { Protocol } from './protocol';
import { pipeProtocols } from './testing';

const log = debug('dxos:protocol:test');

describe('Protocol', function () {
  it('protocol sessions', async function () {
    const topic = crypto.randomBytes(32);

    const protocol1 = new Protocol({
      discoveryKey: topic,
      initiator: true,
      streamOptions: {
        onhandshake: async (protocol) => {
          expect((protocol as any as Protocol).getSession()?.peerId).toEqual('user2');
        }
      },
      userSession: { peerId: 'user1' }
    }).init();

    const protocol2 = new Protocol({
      discoveryKey: topic,
      initiator: false,
      streamOptions: {
        onhandshake: async (protocol) => {
          expect((protocol as any as Protocol).getSession()?.peerId).toEqual('user1');
        }
      },
      userSession: { peerId: 'user2' }
    }).init();

    protocol1.error.on((err) => console.log('protocol1', err));
    protocol2.error.on((err) => console.log('protocol2', err));

    pump(protocol1.stream as any, protocol2.stream as any, protocol1.stream as any);
  }).timeout(1 * 1000);

  it('basic without extensions', async function () {
    const topic = crypto.randomBytes(32);
    let onInitCalled = 0;
    const onInit = () => onInitCalled++;

    const protocol1 = new Protocol({
      discoveryKey: topic,
      initiator: true,
      streamOptions: {
        onhandshake: async () => {
          onInit();

          await protocol1.close();
        }
      },
      userSession: { peerId: 'user1' }
    }).init();

    const protocol2 = new Protocol({
      discoveryKey: topic,
      initiator: false,
      streamOptions: {
        onhandshake: async () => {
          onInit();

          await protocol2.close();
        }
      },
      userSession: { peerId: 'user2' }
    }).init();

    protocol1.error.on((err) => console.log('protocol1', err));
    protocol2.error.on((err) => console.log('protocol2', err));

    await pipeProtocols(protocol1, protocol2);

    expect(onInitCalled).toBe(2);
  }).timeout(1 * 1000);

  it('basic with a buffer ping-pong extension', async function () {
    const topic = crypto.randomBytes(32);
    const bufferExtension = 'buffer';
    const timeout = 1000;

    const protocol1 = new Protocol({
      discoveryKey: topic,
      initiator: true,
      streamOptions: {
        onhandshake: async () => {}
      },
      userSession: { peerId: 'user1' }
    })
      .setExtension(new Extension(bufferExtension, { timeout }).setInitHandler(async () => {}))
      .init();

    const protocol2 = new Protocol({
      discoveryKey: topic,
      initiator: false,
      streamOptions: {
        onhandshake: async () => {}
      },
      userSession: { peerId: 'user2' }
    })
      .setExtension(
        new Extension(bufferExtension, { timeout })
          .setInitHandler(async () => {})
          .setMessageHandler(async (protocol, message) => {
            const { data } = message;

            switch (Buffer.from(data).toString()) {
              case 'ping': {
                return Buffer.from('pong');
              }
              default: {
                throw new Error('Invalid data.');
              }
            }
          })
      )
      .init();

    protocol1.error.on((err) => console.log('protocol1', err));
    protocol2.error.on((err) => console.log('protocol2', err));

    protocol1.setHandshakeHandler(async (protocol) => {
      const bufferMessages = protocol.getExtension(bufferExtension)!;
      expect(bufferMessages).toBeDefined();

      {
        const {
          response: { data }
        } = await bufferMessages.send(Buffer.from('ping'));
        expect(data).toEqual(Buffer.from('pong'));
        await protocol1.close();
      }
    });

    await pipeProtocols(protocol1, protocol2);
  }).timeout(1 * 1000);

  it('basic with a uint8array ping-pong extension', async function () {
    const topic = crypto.randomBytes(32);
    const extension = 'uint8array';
    const timeout = 1000;

    const protocol1 = new Protocol({
      discoveryKey: topic,
      initiator: true,
      streamOptions: {
        onhandshake: async () => {}
      },
      userSession: { peerId: 'user1' }
    })
      .setExtension(new Extension(extension, { timeout }).setInitHandler(async () => {}))
      .init();

    const protocol2 = new Protocol({
      discoveryKey: topic,
      initiator: false,
      streamOptions: {
        onhandshake: async () => {}
      },
      userSession: { peerId: 'user2' }
    })
      .setExtension(
        new Extension(extension, { timeout })
          .setInitHandler(async () => {})
          .setMessageHandler(async (protocol, message) => {
            const { data } = message;

            switch (Buffer.from(data).toString()) {
              case 'ping': {
                return Uint8Array.from(Buffer.from('pong'));
              }
              default: {
                throw new Error('Invalid data.');
              }
            }
          })
      )
      .init();

    protocol1.error.on((err) => console.log('protocol1', err));
    protocol2.error.on((err) => console.log('protocol2', err));

    protocol1.setHandshakeHandler(async (protocol) => {
      const messages = protocol.getExtension(extension)!;
      expect(messages).toBeDefined();

      {
        const {
          response: { data }
        } = await messages.send(Uint8Array.from(Buffer.from('ping')));
        expect(data).toEqual(Buffer.from('pong'));
        await protocol1.close();
      }
    });

    await pipeProtocols(protocol1, protocol2);
  }).timeout(1 * 1000);

  it('basic ping and oneway', async function () {
    expect.assertions(9);

    const bufferExtension = 'buffer';
    const timeout = 100;

    const waitOneWayMessage: any = {};
    waitOneWayMessage.promise = new Promise((resolve) => {
      waitOneWayMessage.resolve = resolve;
    });

    const topic = crypto.randomBytes(32);
    let onInitCalled = 0;
    const onInit = () => onInitCalled++;

    const protocol1 = new Protocol({
      discoveryKey: topic,
      initiator: true,
      userSession: { peerId: 'user1' }
    })
      .setExtension(
        new Extension(bufferExtension, { timeout }).setInitHandler(async () => {
          onInit();
        })
      )
      .setHandshakeHandler(async (protocol) => {
        expect(onInitCalled).toBe(2);

        const bufferMessages = protocol.getExtension(bufferExtension)!;

        bufferMessages.on('error', (err: any) => {
          log('Error: %o', err);
        });

        const { peerId: session } = protocol.getSession() ?? {};
        expect(session).toBe('user2');

        {
          const {
            response: { data }
          } = await bufferMessages.send(Buffer.from('ping'));
          expect(data).toEqual(Buffer.from('pong'));
        }

        {
          const result = await bufferMessages.send(Buffer.from('oneway'), {
            oneway: true
          });
          expect(result).toBeUndefined();
          const data = await waitOneWayMessage.promise;
          expect(data).toEqual(Buffer.from('oneway'));
        }

        try {
          await bufferMessages.send(Buffer.from('crash'));
        } catch (err: any) {
          // eslint-disable-next-line
          expect(ERR_EXTENSION_RESPONSE_FAILED.equals(err)).toBe(true);
          // eslint-disable-next-line
          expect(err.responseMessage).toBe('Invalid data.');
        }

        try {
          await bufferMessages.send(Buffer.from('timeout'));
        } catch (err: any) {
          // eslint-disable-next-line
          expect(ERR_EXTENSION_RESPONSE_TIMEOUT.equals(err)).toBe(true); // timeout.
        }

        log('%o', bufferMessages.stats);
        await protocol1.close();
      })
      .init();

    const protocol2 = new Protocol({
      discoveryKey: topic,
      initiator: false,
      userSession: { peerId: 'user2' }
    })
      .setHandshakeHandler(async () => {
        expect(onInitCalled).toBe(2);
      })
      .setExtension(
        new Extension(bufferExtension, { timeout })
          .setInitHandler(async () => {
            await sleep(200);
            onInit();
          })
          .setMessageHandler(async (protocol, message) => {
            const { data } = message;

            switch (Buffer.from(data).toString()) {
              // Async response.
              case 'ping': {
                return Buffer.from('pong');
              }

              case 'oneway': {
                waitOneWayMessage.resolve(data);
                return;
              }

              // Timeout.
              case 'timeout': {
                await sleep(timeout * 2);
                break;
              }

              // Error.
              default: {
                throw new Error('Invalid data.');
              }
            }
          })
      )
      .init();

    protocol1.error.on((err) => console.log('protocol1', err));
    protocol2.error.on((err) => console.log('protocol2', err));

    expect(protocol1.id).toBeDefined();
    expect(protocol2.id).toBeDefined();

    await pipeProtocols(protocol1, protocol2);
  });

  it('protocol init error', async function () {
    expect.assertions(1);

    const bufferExtension = 'buffer';

    const waitOneWayMessage: any = {};
    waitOneWayMessage.promise = new Promise((resolve) => {
      waitOneWayMessage.resolve = resolve;
    });

    const topic = crypto.randomBytes(32);
    let onHandshakeCalled = 0;
    const onHandshake = () => onHandshakeCalled++;

    const protocol = (name: string, error?: any, initiator?: boolean) =>
      new Protocol({ discoveryKey: topic, initiator: !!initiator })
        .setContext({ name })
        .setHandshakeHandler(async () => {
          onHandshake();
        })
        .setExtension(
          new Extension(bufferExtension).setInitHandler(async () => {
            if (error) {
              await sleep(50);
              throw error;
            }
          })
        )
        .init();

    const protocol1 = protocol('protocol1');
    const protocol2 = protocol('protocol2', new Error('big error'), true);

    await expect(pipeProtocols(protocol1, protocol2)).rejects.toBeDefined();
    expect(onHandshakeCalled).toBe(0);
  });
});
