//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';
import { it as test } from 'mocha';

import { sleep } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';

import { SerializedRpcError } from './errors';
import { Any } from './proto/gen/google/protobuf';
import { RpcPeer } from './rpc';
import { createLinkedPorts } from './testutil';

describe('RpcPeer', () => {
  describe('handshake', () => {
    test('can open', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        messageHandler: async msg => ({}),
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);
    });

    test('open waits for the other peer to call open', async () => {
      const [alicePort, bobPort] = createLinkedPorts();
      const alice: RpcPeer = new RpcPeer({
        messageHandler: async msg => ({}),
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      let aliceOpen = false;
      const promise = alice.open().then(() => {
        aliceOpen = true;
      });

      await sleep(5);

      expect(aliceOpen).toEqual(false);

      await bob.open();
      await aliceOpen;

      expect(aliceOpen).toEqual(true);
      await promise;
    });

    test('one peer can open before the other is created', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        messageHandler: async msg => ({}),
        port: alicePort
      });
      const aliceOpen = alice.open();

      await sleep(5);

      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        aliceOpen,
        bob.open()
      ]);
    });

    test('handshake works with a port that is open later', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      let portOpen = false;

      const alice: RpcPeer = new RpcPeer({
        messageHandler: async msg => ({}),
        port: {
          send: msg => {
            portOpen && alicePort.send(msg);
          },
          subscribe: alicePort.subscribe
        }
      });

      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: {
          send: msg => {
            portOpen && bobPort.send(msg);
          },
          subscribe: bobPort.subscribe
        }
      });

      const openPromise = Promise.all([
        alice.open(),
        bob.open()
      ]);

      await sleep(5);

      portOpen = true;

      await openPromise;
    });

    test('open hangs on half-open streams', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        messageHandler: async msg => ({}),
        port: {
          send: msg => { },
          subscribe: alicePort.subscribe
        }
      });

      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      let open = false;
      void Promise.all([
        alice.open(),
        bob.open()
      ]).then(() => {
        open = true;
      });

      await sleep(5);

      expect(open).toEqual(false);

      alice.close();
      bob.close();
    });
  });

  describe('one-off requests', () => {
    test('can send a request', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        messageHandler: async (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(Buffer.from('request'));
          return { value: Buffer.from('response') };
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async (method, msg) => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      const response = await bob.call('method', { value: Buffer.from('request') });
      expect(response).toEqual({ value: Buffer.from('response') });
    });

    test('can send multiple requests', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        messageHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);

          const text = Buffer.from(msg.value!).toString();

          if (text === 'error') {
            throw new Error('test error');
          }

          return msg;
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      expect((await bob.call('method', { value: Buffer.from('request') })).value).toEqual(Buffer.from('request'));

      const parallel1 = bob.call('method', { value: Buffer.from('p1') });
      const parallel2 = bob.call('method', { value: Buffer.from('p2') });
      const error = bob.call('method', { value: Buffer.from('error') });

      await expect(await parallel1).toEqual({ value: Buffer.from('p1') });
      await expect(await parallel2).toEqual({ value: Buffer.from('p2') });
      await expect(error).toBeRejected();
    });

    test('errors get serialized', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        messageHandler: async (method, msg) => {
          expect(method).toEqual('RpcMethodName');
          const handlerFn = async (): Promise<never> => {
            throw new Error('My error');
          };

          return await handlerFn();
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      let error!: Error;
      try {
        await bob.call('RpcMethodName', { value: Buffer.from('request') });
      } catch (err: any) {
        error = err;
      }

      expect(error).toBeA(SerializedRpcError);
      expect(error.message).toEqual('My error');
      expect(error.stack?.includes('handlerFn')).toEqual(true);
      expect(error.stack?.includes('RpcMethodName')).toEqual(true);
    });

    test('closing local endpoint stops pending requests', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        messageHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);
          return msg;
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      const req = bob.call('method', { value: Buffer.from('request') });
      bob.close();

      await expect(req).toBeRejected();
    });

    test('closing remote endpoint stops pending requests on timeout', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        messageHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);
          return msg;
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort,
        timeout: 50
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      alice.close();
      const req = bob.call('method', { value: Buffer.from('request') });

      await expect(req).toBeRejected();
    });

  });

  describe('streaming responses', () => {
    test('can transport multiple messages', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        messageHandler: async msg => ({}),
        streamHandler: (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value!).toEqual(Buffer.from('request'));
          return new Stream<Any>(({ next, close }) => {
            next({ value: Buffer.from('res1') });
            next({ value: Buffer.from('res2') });
            close();
          });
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      const stream = await bob.callStream('method', { value: Buffer.from('request') });
      expect(stream).toBeA(Stream);

      expect(await Stream.consume(stream)).toEqual([
        { data: { value: Buffer.from('res1') } },
        { data: { value: Buffer.from('res2') } },
        { closed: true }
      ]);
    });

    test('server closes with an error', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        messageHandler: async msg => ({}),
        streamHandler: (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(Buffer.from('request'));
          return new Stream<Any>(({ next, close }) => {
            close(new Error('Test error'));
          });
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      const stream = await bob.callStream('method', { value: Buffer.from('request') });
      expect(stream).toBeA(Stream);

      const msgs = await Stream.consume(stream);
      expect(msgs).toEqual([
        { closed: true, error: expect.a(Error) }
      ]);

      expect((msgs[0] as any).error.message).toEqual('Test error');
    });

    test('client closes the stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      let closeCalled = false;
      const alice = new RpcPeer({
        messageHandler: async msg => ({}),
        streamHandler: (method, msg) => new Stream<Any>(({ next, close }) => () => {
          closeCalled = true;
        }),
        port: alicePort
      });

      const bob = new RpcPeer({
        messageHandler: async msg => ({}),
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      const stream = bob.callStream('method', { value: Buffer.from('request') });
      stream.close();

      await sleep(1);

      expect(closeCalled).toEqual(true);
    });
  });

  describe('with disabled handshake', () => {
    test('opens immediately', async () => {
      const [alicePort] = createLinkedPorts();

      const alice = new RpcPeer({
        messageHandler: async msg => ({}),
        port: alicePort,
        noHandshake: true
      });

      await alice.open();
    });

    test('can send a request', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        messageHandler: async (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(Buffer.from('request'));
          return { value: Buffer.from('response') };
        },
        port: alicePort,
        noHandshake: true
      });
      const bob = new RpcPeer({
        messageHandler: async (method, msg) => ({}),
        port: bobPort,
        noHandshake: true
      });

      await alice.open();
      await bob.open();

      const response = await bob.call('method', { value: Buffer.from('request') });
      expect(response).toEqual({ value: Buffer.from('response') });
    });
  });
});
