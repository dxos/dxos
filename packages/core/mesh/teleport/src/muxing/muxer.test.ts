//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';
import { Transform, pipeline } from 'node:stream';
import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, latch, sleep } from '@dxos/async';
import { type BufService, getBufService } from '@dxos/protocols/buf-service';
import {
  TestRpcRequestSchema,
  TestRpcResponseSchema,
  TestService as TestServiceDesc,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { createProtoRpcPeer } from '@dxos/rpc';

import { Muxer } from './muxer.ts';
import { type RpcPort } from './rpc-port.ts';

type TestService = BufService<typeof TestServiceDesc>;

const setupPeers = () => {
  const peer1 = new Muxer();
  const peer2 = new Muxer();

  peer1.stream.pipe(peer2.stream).pipe(peer1.stream);

  const unpipe = () => {
    peer1.stream.unpipe(peer2.stream);
    peer2.stream.unpipe(peer1.stream);
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

  test('an rpc port opens when the first frame to the remote is lost', async () => {
    const peer1 = new Muxer();
    const peer2 = new Muxer();
    // Drops peer2's first frame, which carries its OpenChannel command.
    let dropped = false;
    const lossy = new Transform({
      transform: (chunk, _encoding, callback) => {
        if (!dropped) {
          dropped = true;
          callback();
          return;
        }
        callback(null, chunk);
      },
    });
    peer1.stream.pipe(peer2.stream);
    peer2.stream.pipe(lossy).pipe(peer1.stream);
    onTestFinished(async () => {
      await peer1.destroy();
      await peer2.destroy();
    });

    const clients = await Promise.all(
      [peer1, peer2].map(async (peer) =>
        createRpc(
          await peer.createPort('example.extension/rpc', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
          }),
          async ({ data }) => create(TestRpcResponseSchema, { data }),
        ),
      ),
    );

    await asyncTimeout(Promise.all(clients.map((client) => client.open())), 10_000);
    expect(await clients[0].rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'test' }))).to.deep.include({
      data: 'test',
    });
  });

  test('a resent OpenChannel does not resend buffered data', async () => {
    const peer1 = new Muxer();
    const peer2 = new Muxer();
    onTestFinished(async () => {
      await peer1.destroy();
      await peer2.destroy();
    });
    // peer2's frames to peer1 are not consumed until after peer1 has resent its OpenChannel, so peer2's flush of its
    // buffer is still stalled when the resend arrives.
    peer1.stream.pipe(peer2.stream);

    const port2 = await peer2.createPort('example.extension/rpc');
    const count = 20;
    for (let i = 0; i < count; i++) {
      await port2.send(new Uint8Array(8_000).fill(i));
    }

    const port1 = await peer1.createPort('example.extension/rpc');
    const received: number[] = [];
    port1.subscribe((data) => received.push(data[0]));

    await sleep(7_000);
    peer2.stream.pipe(peer1.stream);
    // Written while the buffer is still flushing, so they must arrive after it.
    const later = 5;
    for (let i = count; i < count + later; i++) {
      await port2.send(new Uint8Array(8_000).fill(i));
    }

    await expect.poll(() => received.length, { timeout: 5_000 }).toBe(count + later);
    await sleep(500);
    expect(received).toEqual(Array.from({ length: count + later }, (_, index) => index));
  }, 30_000);

  test('a write made after the remote opens the channel waits on the link', async () => {
    const peer1 = new Muxer();
    const peer2 = new Muxer();
    onTestFinished(async () => {
      await peer1.destroy();
      await peer2.destroy();
    });
    // peer2's frames to peer1 are not consumed yet, so everything peer2 sends backs up.
    peer1.stream.pipe(peer2.stream);

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

    peer2.stream.pipe(peer1.stream);
    await write;
    await expect.poll(() => received.length, { timeout: 5_000 }).toBe(count + 1);
    expect(received).toEqual(Array.from({ length: count + 1 }, (_, index) => index));
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

  test('node.js streams', async () => {
    const { peer1, peer2 } = setupPeers();

    const stream2 = await peer2.createStream('example.extension/stream1', {
      contentType: 'application/octet-stream',
    });

    // Buffer data before remote peer opens.
    stream2.write('hello');

    const stream1 = await peer1.createStream('example.extension/stream1', {
      contentType: 'application/octet-stream',
    });

    pipeline(
      stream1,
      new Transform({
        transform: (chunk, encoding, callback) => {
          callback(null, Buffer.from(Buffer.from(chunk).toString().toUpperCase())); // Make all characters uppercase.
        },
      }),
      stream1,
      () => {},
    );

    let received = '';
    stream2.on('data', (chunk) => {
      received += Buffer.from(chunk).toString();
    });

    stream2.write(' world!');

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

    stream1.once('close', inc);
    stream2.once('close', inc);

    await peer1.destroy();
    // Peer2 should also be destroyed.

    await wait();
  });
});
