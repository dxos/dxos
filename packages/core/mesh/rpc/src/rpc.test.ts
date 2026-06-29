//
// Copyright 2021 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { type Any, Stream, type TaggedType } from '@dxos/codec-protobuf';
import { log } from '@dxos/log';
import { type TYPES } from '@dxos/protocols/proto';

import { RpcPeer } from './rpc';
import { createLinkedPorts, encodeMessage } from './testing';

const createPayload = (value = ''): TaggedType<TYPES, 'google.protobuf.Any'> => ({
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.test',
  value: encodeMessage(value),
});

// TODO(dmaretskyi): Rename alice and bob to peer1 and peer2.

describe('RpcPeer', () => {
  describe('handshake', () => {
    test('can open', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);
    });

    test('open waits for the other peer to call open', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      let aliceOpen = false;
      const promise = alice.open().then(() => {
        aliceOpen = true;
      });

      await sleep(5);
      expect(aliceOpen).toEqual(false);

      await bob.open();

      await promise;

      expect(aliceOpen).toEqual(true);
    });

    test('one peer can open before the other is created', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort,
      });

      const aliceOpen = alice.open();
      await sleep(5);

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([aliceOpen, bob.open()]);
    });

    test('handshake works with a port that is open later', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      let portOpen = false;

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: {
          send: (msg) => {
            if (portOpen) {
              void alicePort.send(msg);
            }
          },
          subscribe: alicePort.subscribe,
        },
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: {
          send: (msg) => {
            if (portOpen) {
              void bobPort.send(msg);
            }
          },
          subscribe: bobPort.subscribe,
        },
      });

      const openPromise = Promise.all([alice.open(), bob.open()]);

      await sleep(5);

      portOpen = true;

      await openPromise;
    });

    test('open hangs on half-open streams', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: {
          send: (msg) => {},
          subscribe: alicePort.subscribe,
        },
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      let open = false;
      void Promise.all([alice.open(), bob.open()]).then(() => {
        open = true;
      });

      await sleep(5);

      expect(open).toEqual(false);

      await alice.close({ timeout: 10 });
      await bob.close({ timeout: 10 });
    });

    test('can close while opening', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: {
          send: (msg) => {},
          subscribe: alicePort.subscribe,
        },
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      const openPromise = Promise.all([alice.open(), bob.open()]);
      await sleep(5);
      await Promise.all([alice.close(), bob.close()]);
      await openPromise;
    });
  });

  describe('one-off requests', () => {
    test('can send a request', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(encodeMessage('request'));
          return createPayload('response');
        },
        port: alicePort,
      });
      const bob = new RpcPeer({
        callHandler: async (method, msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const response = await bob.call('method', createPayload('request'));
      expect(response).toEqual(createPayload('response'));

      await Promise.all([alice.close(), bob.close()]);
    });

    test.skip('can send multiple requests', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);

          const text = Buffer.from(msg.value!).toString();

          if (text === 'error') {
            throw new Error('test error');
          }

          return msg;
        },
        port: alicePort,
      });
      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      expect((await bob.call('method', createPayload('request'))).value).toEqual(encodeMessage('request'));

      const parallel1 = bob.call('method', createPayload('p1'));
      const parallel2 = bob.call('method', createPayload('p2'));
      const error = bob.call('method', createPayload('error'));

      await expect(await parallel1).toEqual(createPayload('p1'));
      await expect(await parallel2).toEqual(createPayload('p2'));
      await expect(error).rejects.toBeInstanceOf(Error);
    });

    test('errors get serialized', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('RpcMethodName');
          const handlerFn = async (): Promise<never> => {
            throw new Error('My error');
          };

          return await handlerFn();
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      let error!: Error;
      try {
        await bob.call('RpcMethodName', createPayload('request'));
      } catch (err: any) {
        error = err;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toEqual('My error');
      expect(error.stack?.includes('handlerFn')).toEqual(true);
      expect(error.stack?.includes('RpcMethodName')).toEqual(true);
    });

    test('closing local endpoint stops pending requests', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);
          return msg;
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const req = bob.call('method', createPayload('request'));
      await bob.close();

      await expect(req).rejects.toBeInstanceOf(Error);
    });

    test('closing remote endpoint stops pending requests on timeout', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);
          return msg;
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
        timeout: 50,
      });

      await Promise.all([alice.open(), bob.open()]);

      await alice.close();
      const req = bob.call('method', createPayload('request'));

      await expect(req).rejects.toBeInstanceOf(Error);
    });

    test('requests failing on timeout', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(50);
          return msg;
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
        timeout: 10,
      });

      await Promise.all([alice.open(), bob.open()]);

      const req = bob.call('method', createPayload('request'));
      await expect(req).rejects.toBeInstanceOf(Error);
    });
  });

  describe('streaming responses', () => {
    test('can transport multiple messages', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value!).toEqual(encodeMessage('request'));
          return new Stream<Any>(({ next, close }) => {
            next(createPayload('res1'));
            next(createPayload('res2'));
            close();
          });
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeInstanceOf(Stream);

      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: createPayload('res1') },
        { data: createPayload('res2') },
        { closed: true },
      ]);
    });

    test('server closes with an error', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(encodeMessage('request'));
          return new Stream<Any>(({ next, close }) => {
            close(new Error('Test error'));
          });
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeInstanceOf(Stream);

      const msgs = await Stream.consume(stream);
      expect(msgs.length).toEqual(1);
      expect((msgs[0] as any).closed).toEqual(true);
      expect((msgs[0] as any).error).toBeInstanceOf(Error);
      expect((msgs[0] as any).error.message).toEqual('Test error');
    });

    test('client closes the stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      let closeCalled = false;
      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg) =>
          new Stream<Any>(({ next, close }) => () => {
            closeCalled = true;
          }),
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = bob.callStream('method', createPayload('request'));
      await stream.close();

      await sleep(1);

      expect(closeCalled).toEqual(true);
    });

    test('reports stream being ready', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value!).toEqual(encodeMessage('request'));
          return new Stream<Any>(({ ready, close }) => {
            ready();
            close();
          });
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeInstanceOf(Stream);

      await stream.waitUntilReady();

      expect(await Stream.consume(stream)).toEqual([{ ready: true }, { closed: true }]);
    });

    test('stream handlers throws', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg): Stream<Any> => {
          throw new Error('Test error');
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeInstanceOf(Stream);

      const msgs = await Stream.consume(stream);
      expect(msgs.length).toEqual(1);
      expect((msgs[0] as any).closed).toEqual(true);
      expect((msgs[0] as any).error).toBeInstanceOf(Error);
      expect((msgs[0] as any).error.message).toEqual('Test error');
    });
  });

  describe('with disabled handshake', () => {
    test('opens immediately', async () => {
      const [alicePort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort,
        noHandshake: true,
      });

      await alice.open();
    });

    test('can send a request', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(encodeMessage('request'));
          return createPayload('response');
        },
        port: alicePort,
        noHandshake: true,
      });

      const bob = new RpcPeer({
        callHandler: async (method, msg) => createPayload(),
        port: bobPort,
        noHandshake: true,
      });

      await alice.open();
      await bob.open();

      const response = await bob.call('method', createPayload('request'));
      expect(response).toEqual(createPayload('response'));

      await Promise.all([alice.close(), bob.close()]);
    });
  });

  describe('closure', () => {
    test('responses to rpc calls before close are delivered', async () => {
      const [alicePort, bobPort] = createLinkedPorts({ delay: 5 });

      const closeTrigger = new Trigger();
      const events: string[] = [];

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          setTimeout(async () => {
            log('alice: closing');
            await alice.close();
            log('alice: closed');
            events.push('closed');
            closeTrigger.wake();
          });
          log('alice: responding');
          return msg;
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      await bob.call('method', createPayload('request')).then(() => events.push('response received'));

      await closeTrigger.wait();

      expect(events).toEqual(['response received', 'closed']);
    });

    test('abort resolves immediately', async () => {
      const [alicePort, bobPort] = createLinkedPorts({ delay: 5 });

      const closeTrigger = new Trigger();
      const events: string[] = [];

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          setTimeout(async () => {
            log('alice: closing');
            await alice.abort();
            log('alice: closed');
            events.push('closed');
            closeTrigger.wake();
          });
          log('alice: responding');
          return msg;
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      await bob.call('method', createPayload('request')).then(() => events.push('response received'));

      await closeTrigger.wait();

      expect(events).toEqual(['closed', 'response received']);
    });

    test('close is idempotent', async () => {
      const [alicePort, bobPort] = createLinkedPorts({ delay: 5 });

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          return msg;
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      await bob.call('method', createPayload('request'));

      void alice.close();
      void alice.close();

      await Promise.all([alice.close(), bob.close()]);
    });

    test('open and close immediately', async () => {
      const [alicePort, bobPort] = createLinkedPorts({ delay: 5 });

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          return msg;
        },
        port: alicePort,
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
      });

      void alice.open();
      void bob.open();

      await alice.close();
      await bob.close();
    });
  });
});
