//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';

import { sleep } from '@dxos/async';
import { Any, Stream, TaggedType } from '@dxos/codec-protobuf';
import { TYPES } from '@dxos/protocols';

import { SerializedRpcError } from './errors';
import { RpcPeer } from './rpc';
import { createLinkedPorts } from './testing';

const createPayload = (value = ''): TaggedType<TYPES, 'google.protobuf.Any'> => ({
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.test',
  value: Buffer.from(value)
});

describe('RpcPeer', function () {
  describe('handshake', function () {
    it('can open', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);
    });

    it('open waits for the other peer to call open', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
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

    it('one peer can open before the other is created', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort
      });

      const aliceOpen = alice.open();
      await sleep(5);

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([aliceOpen, bob.open()]);
    });

    it('handshake works with a port that is open later', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      let portOpen = false;

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: {
          send: (msg) => {
            portOpen && alicePort.send(msg);
          },
          subscribe: alicePort.subscribe
        }
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: {
          send: (msg) => {
            portOpen && bobPort.send(msg);
          },
          subscribe: bobPort.subscribe
        }
      });

      const openPromise = Promise.all([alice.open(), bob.open()]);

      await sleep(5);

      portOpen = true;

      await openPromise;
    });

    it('open hangs on half-open streams', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: {
          send: (msg) => {},
          subscribe: alicePort.subscribe
        }
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      let open = false;
      void Promise.all([alice.open(), bob.open()]).then(() => {
        open = true;
      });

      await sleep(5);

      expect(open).toEqual(false);

      await alice.close();
      await bob.close();
    });
  });

  describe('one-off requests', function () {
    it('can send a request', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(Buffer.from('request'));
          return createPayload('response');
        },
        port: alicePort
      });
      const bob = new RpcPeer({
        callHandler: async (method, msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      const response = await bob.call('method', createPayload('request'));
      expect(response).toEqual(createPayload('response'));
    });

    it('can send multiple requests', async function () {
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
        port: alicePort
      });
      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      expect((await bob.call('method', createPayload('request'))).value).toEqual(Buffer.from('request'));

      const parallel1 = bob.call('method', createPayload('p1'));
      const parallel2 = bob.call('method', createPayload('p2'));
      const error = bob.call('method', createPayload('error'));

      await expect(await parallel1).toEqual(createPayload('p1'));
      await expect(await parallel2).toEqual(createPayload('p2'));
      await expect(error).toBeRejected();
    });

    it('errors get serialized', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('RpcMethodName');
          const handlerFn = async (): Promise<never> => {
            throw new Error('My error');
          };

          return await handlerFn();
        },
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      let error!: Error;
      try {
        await bob.call('RpcMethodName', createPayload('request'));
      } catch (err: any) {
        error = err;
      }

      expect(error).toBeA(SerializedRpcError);
      expect(error.message).toEqual('My error');
      expect(error.stack?.includes('handlerFn')).toEqual(true);
      expect(error.stack?.includes('RpcMethodName')).toEqual(true);
    });

    it('closing local endpoint stops pending requests', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);
          return msg;
        },
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      const req = bob.call('method', createPayload('request'));
      await bob.close();

      await expect(req).toBeRejected();
    });

    it('closing remote endpoint stops pending requests on timeout', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(5);
          return msg;
        },
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
        timeout: 50
      });

      await Promise.all([alice.open(), bob.open()]);

      await alice.close();
      const req = bob.call('method', createPayload('request'));

      await expect(req).toBeRejected();
    });

    it('requests failing on timeout', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice: RpcPeer = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          await sleep(50);
          return msg;
        },
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort,
        timeout: 10
      });

      await Promise.all([alice.open(), bob.open()]);

      const req = bob.call('method', createPayload('request'));
      await expect(req).toBeRejected();
    });
  });

  describe('streaming responses', function () {
    it('can transport multiple messages', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value!).toEqual(Buffer.from('request'));
          return new Stream<Any>(({ next, close }) => {
            next(createPayload('res1'));
            next(createPayload('res2'));
            close();
          });
        },
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeA(Stream);

      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: createPayload('res1') },
        { data: createPayload('res2') },
        { closed: true }
      ]);
    });

    it('server closes with an error', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
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
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeA(Stream);

      const msgs = await Stream.consume(stream);
      expect(msgs).toEqual([{ closed: true, error: expect.a(Error) }]);

      expect((msgs[0] as any).error.message).toEqual('Test error');
    });

    it('client closes the stream', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      let closeCalled = false;
      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg) =>
          new Stream<Any>(({ next, close }) => () => {
            closeCalled = true;
          }),
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = bob.callStream('method', createPayload('request'));
      stream.close();

      await sleep(1);

      expect(closeCalled).toEqual(true);
    });

    it('reports stream being ready', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value!).toEqual(Buffer.from('request'));
          return new Stream<Any>(({ ready, close }) => {
            ready();
            close();
          });
        },
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeA(Stream);

      await stream.waitUntilReady();

      expect(await Stream.consume(stream)).toEqual([{ ready: true }, { closed: true }]);
    });

    it('stream handlers throws', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        streamHandler: (method, msg): Stream<Any> => {
          throw new Error('Test error');
        },
        port: alicePort
      });

      const bob = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: bobPort
      });

      await Promise.all([alice.open(), bob.open()]);

      const stream = await bob.callStream('method', createPayload('request'));
      expect(stream).toBeA(Stream);

      const msgs = await Stream.consume(stream);
      expect(msgs).toEqual([{ closed: true, error: expect.a(Error) }]);

      expect((msgs[0] as any).error.message).toEqual('Test error');
    });
  });

  describe('with disabled handshake', function () {
    it('opens immediately', async function () {
      const [alicePort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (msg) => createPayload(),
        port: alicePort,
        noHandshake: true
      });

      await alice.open();
    });

    it('can send a request', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = new RpcPeer({
        callHandler: async (method, msg) => {
          expect(method).toEqual('method');
          expect(msg.value).toEqual(Buffer.from('request'));
          return createPayload('response');
        },
        port: alicePort,
        noHandshake: true
      });

      const bob = new RpcPeer({
        callHandler: async (method, msg) => createPayload(),
        port: bobPort,
        noHandshake: true
      });

      await alice.open();
      await bob.open();

      const response = await bob.call('method', createPayload('request'));
      expect(response).toEqual(createPayload('response'));
    });
  });
});
