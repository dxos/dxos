//
// Copyright 2022 DXOS.org
//

import { Transform, pipeline } from 'node:stream';

import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, latch } from '@dxos/async';
import { schema } from '@dxos/protocols/proto';
import { type TestService } from '@dxos/protocols/proto/example/testing/rpc';
import { createProtoRpcPeer } from '@dxos/rpc';

import { Muxer } from './muxer';
import { type RpcPort } from './rpc-port';

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
      TestService: schema.getService('example.testing.rpc.TestService'),
    },
    exposed: {
      TestService: schema.getService('example.testing.rpc.TestService'),
    },
    handlers: {
      TestService: {
        testCall: handler,
        voidCall: async () => {},
      },
    },
    port,
  });

describe('Muxer', () => {
  test('rpc calls on 1 port', async () => {
    const { peer1, peer2 } = setupPeers();

    const [wait, inc] = latch({ count: 2, timeout: 500 });

    for (const peer of [peer1, peer2]) {
      const client = createRpc(
        await peer.createPort('example.extension/rpc', {
          contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
        }),
        async ({ data }) => ({ data }),
      );

      setTimeout(async () => {
        await client.open();
        expect(await client.rpc.TestService.testCall({ data: 'test' })).to.deep.eq({ data: 'test' });
        inc();
      });
    }

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

    for (const peer of [peer1, peer2]) {
      {
        const client = createRpc(
          await peer.createPort('example.extension/rpc1', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
          }),
          async ({ data }) => ({ data: data + '-rpc1' }),
        );

        setTimeout(async () => {
          await client.open();
          expect(await client.rpc.TestService.testCall({ data: 'test' })).to.deep.eq({ data: 'test-rpc1' });
          inc();
        });
      }
      {
        const client = createRpc(
          await peer.createPort('example.extension/rpc2', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
          }),
          async ({ data }) => ({ data: data + '-rpc2' }),
        );

        setTimeout(async () => {
          await client.open();
          expect(await client.rpc.TestService.testCall({ data: 'test' })).to.deep.eq({ data: 'test-rpc2' });
          inc();
        });
      }
    }

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
