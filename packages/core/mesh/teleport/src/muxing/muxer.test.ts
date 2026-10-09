//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';
import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, latch, sleep } from '@dxos/async';
import { type BufService, getBufService } from '@dxos/protocols/buf-service';
import {
  TestRpcRequestSchema,
  TestRpcResponseSchema,
  TestService as TestServiceDesc,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { createProtoRpcPeer } from '@dxos/rpc';
import { concatUint8Arrays } from '@dxos/util';

import { connectDuplexStreams, readAll } from './duplex-stream.ts';
import { Muxer } from './muxer.ts';
import { type RpcPort } from './rpc-port.ts';

type TestService = BufService<typeof TestServiceDesc>;

const setupPeers = () => {
  const peer1 = new Muxer();
  const peer2 = new Muxer();

  const unpipe = connectDuplexStreams(peer1.stream, peer2.stream);

  onTestFinished(async () => {
    await unpipe();
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

  test('a repeated OpenChannel flushes the buffer once, and a write made during the flush keeps its own deadline', async () => {
    const peer1 = new Muxer();
    const peer2 = new Muxer();
    onTestFinished(async () => {
      await peer1.destroy();
      await peer2.destroy();
    });
    // peer1's first frame, its OpenChannel, reaches peer2 twice.
    let repeated = false;
    const repeatFirstFrame = new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        controller.enqueue(repeated ? chunk : concatUint8Arrays(chunk, chunk));
        repeated = true;
      },
    });
    // peer2's frames to peer1 are not consumed yet, so peer2's flush of its buffer is stalled when the repeat arrives.
    void peer1.stream.readable
      .pipeThrough(repeatFirstFrame)
      .pipeTo(peer2.stream.writable)
      .catch(() => {});

    const port2 = await peer2.createPort('example.extension/rpc');
    const count = 40;
    for (let i = 0; i < count; i++) {
      await port2.send(new Uint8Array(8_000).fill(i));
    }

    const port1 = await peer1.createPort('example.extension/rpc');
    const received: number[] = [];
    port1.subscribe((data) => received.push(data[0]));

    await sleep(200);
    // One frame every 60 ms: the backlog takes longer to go out than a later write is allowed to wait.
    const throttle = new TransformStream<Uint8Array, Uint8Array>({
      transform: async (chunk, controller) => {
        await sleep(60);
        controller.enqueue(chunk);
      },
    });
    void peer2.stream.readable
      .pipeThrough(throttle)
      .pipeTo(peer1.stream.writable)
      .catch(() => {});
    const later = 5;
    for (let i = count; i < count + later; i++) {
      await port2.send(new Uint8Array(8_000).fill(i), 1_500);
    }

    await expect.poll(() => received.length, { timeout: 5_000 }).toBe(count + later);
    await sleep(500);
    expect(received).toEqual(Array.from({ length: count + later }, (_, index) => index));
  }, 15_000);

  test('a write made after the remote opens the channel waits on the link', async () => {
    const peer1 = new Muxer();
    const peer2 = new Muxer();
    onTestFinished(async () => {
      await peer1.destroy();
      await peer2.destroy();
    });
    // peer2's frames to peer1 are not consumed yet, so everything peer2 sends backs up.
    void peer1.stream.readable.pipeTo(peer2.stream.writable).catch(() => {});

    const port2 = await peer2.createPort('example.extension/rpc');
    const count = 20;
    for (let i = 0; i < count; i++) {
      await port2.send(new Uint8Array(8_000).fill(i));
    }
    const port1 = await peer1.createPort('example.extension/rpc');
    const received: number[] = [];
    port1.subscribe((data) => received.push(data[0]));
    await sleep(200);

    // Once the remote has opened the channel a write is a real send, so it cannot complete while the link is stalled.
    const write = Promise.resolve(port2.send(new Uint8Array(8_000).fill(count)));
    const outcome = await Promise.race([write.then(() => 'sent'), sleep(500).then(() => 'waiting')]);
    expect(outcome).toEqual('waiting');

    void peer2.stream.readable.pipeTo(peer1.stream.writable).catch(() => {});
    await write;
    await expect.poll(() => received.length, { timeout: 5_000 }).toBe(count + 1);
    expect(received).toEqual(Array.from({ length: count + 1 }, (_, index) => index));
  });

  test('destroying a muxer releases writes still waiting on the link', async () => {
    const peer1 = new Muxer();
    const peer2 = new Muxer();
    onTestFinished(async () => {
      await peer1.destroy();
    });
    // peer2's frames to peer1 are never consumed, so everything peer2 sends backs up.
    void peer1.stream.readable.pipeTo(peer2.stream.writable).catch(() => {});

    const port2 = await peer2.createPort('example.extension/rpc');
    for (let i = 0; i < 20; i++) {
      await port2.send(new Uint8Array(8_000).fill(i));
    }
    await peer1.createPort('example.extension/rpc');
    await sleep(200);

    const write = Promise.resolve(port2.send(new Uint8Array(8_000).fill(20)));
    await peer2.destroy();
    await asyncTimeout(write, 1_000);
  }, 15_000);

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
