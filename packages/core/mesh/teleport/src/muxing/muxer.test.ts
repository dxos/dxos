//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';
import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, latch } from '@dxos/async';
import { type BufService, getBufService } from '@dxos/protocols/buf-service';
import {
  TestRpcRequestSchema,
  TestRpcResponseSchema,
  TestService as TestServiceDesc,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { createProtoRpcPeer } from '@dxos/rpc';

import { connectDuplexStreams, readAll } from './duplex-stream.ts';
import { Muxer } from './muxer.ts';
import { type RpcPort } from './rpc-port.ts';

type TestService = BufService<typeof TestServiceDesc>;

const setupPeers = () => {
  const peer1 = new Muxer();
  const peer2 = new Muxer();

  connectDuplexStreams(peer1.stream, peer2.stream);

  const unpipe = () => {
    void peer1.stream.readable.cancel().catch(() => {});
    void peer2.stream.readable.cancel().catch(() => {});
  };
  onTestFinished(async () => {
    unpipe();
    await peer1.destroy();
    await peer2.destroy();
  });

  return {
    peer1,
    peer2,
    unpipe,
  };
};

const createRpc = (port: RpcPort, handler: TestService['testCall']) =>
  createProtoRpcPeer({
    requested: {
      TestService: getBufService<TestService>('example.testing.rpc.TestService'),
    },
    exposed: {
      TestService: getBufService<TestService>('example.testing.rpc.TestService'),
    },
    handlers: {
      TestService: {
        testCall: handler,
        voidCall: async () => create(EmptySchema, {}),
      },
    },
    port,
  });

describe('Muxer', () => {
  test('rpc calls on 1 port', async () => {
    const { peer1, peer2 } = setupPeers();

    const [wait, inc] = latch({ count: 2, timeout: 500 });

    const clients: Array<ReturnType<typeof createRpc>> = [];
    for (const peer of [peer1, peer2]) {
      clients.push(
        createRpc(
          await peer.createPort('example.extension/rpc', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
          }),
          async ({ data }) => create(TestRpcResponseSchema, { data }),
        ),
      );
    }

    await Promise.all(
      clients.map(async (client) => {
        await client.open();
        expect(await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'test' }))).to.deep.include({
          data: 'test',
        });
        inc();
      }),
    );

    await wait();
  });

  test('destroy releases other stream', async () => {
    const { peer1, peer2 } = setupPeers();

    const promise = asyncTimeout(peer1.afterClosed.waitForCount(1), 100);
    await peer2.destroy();
    await promise;
  });

  test('two concurrent rpc ports', async () => {
    const { peer1, peer2 } = setupPeers();

    const [wait, inc] = latch({ count: 4, timeout: 500 });

    const clients: Array<{ client: ReturnType<typeof createRpc>; expected: string }> = [];
    for (const peer of [peer1, peer2]) {
      clients.push({
        client: createRpc(
          await peer.createPort('example.extension/rpc1', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
          }),
          async ({ data }) => create(TestRpcResponseSchema, { data: data + '-rpc1' }),
        ),
        expected: 'test-rpc1',
      });
      clients.push({
        client: createRpc(
          await peer.createPort('example.extension/rpc2', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
          }),
          async ({ data }) => create(TestRpcResponseSchema, { data: data + '-rpc2' }),
        ),
        expected: 'test-rpc2',
      });
    }

    await Promise.all(
      clients.map(async ({ client, expected }) => {
        await client.open();
        expect(await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'test' }))).to.deep.include({
          data: expected,
        });
        inc();
      }),
    );

    await wait();
  });

  test('duplex byte streams', async () => {
    const { peer1, peer2 } = setupPeers();

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream2 = await peer2.createStream('example.extension/stream1', {
      contentType: 'application/octet-stream',
    });
    const writer2 = stream2.writable.getWriter();

    // Buffer data before remote peer opens.
    void writer2.write(encoder.encode('hello'));

    const stream1 = await peer1.createStream('example.extension/stream1', {
      contentType: 'application/octet-stream',
    });

    // Echo back in upper case.
    const upperCase = new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        controller.enqueue(encoder.encode(decoder.decode(chunk).toUpperCase()));
      },
    });
    void stream1.readable
      .pipeThrough(upperCase)
      .pipeTo(stream1.writable)
      .catch(() => {});

    let received = '';
    void readAll(stream2.readable, (chunk) => {
      received += decoder.decode(chunk);
    }).catch(() => {});

    void writer2.write(encoder.encode(' world!'));

    await expect.poll(() => received).toEqual('HELLO WORLD!');
  });

  test('destroying muxers destroys open streams', async () => {
    const { peer1, peer2 } = setupPeers();

    const stream1 = await peer1.createStream('example.extension/stream1', {
      contentType: 'application/octet-stream',
    });

    const stream2 = await peer2.createStream('example.extension/stream1', {
      contentType: 'application/octet-stream',
    });

    const [wait, inc] = latch({ count: 2, timeout: 500 });

    // A destroyed muxer ends both channel readables — cleanly when there is no error, with a
    // rejection when there is — so either settlement counts as the stream having been closed.
    void stream1.readable.getReader().closed.then(inc, inc);
    void stream2.readable.getReader().closed.then(inc, inc);

    await peer1.destroy();
    // Peer2 should also be destroyed.

    await wait();
  });
});
