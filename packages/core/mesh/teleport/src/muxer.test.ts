//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch, promiseTimeout } from '@dxos/async';
import { schema } from '@dxos/protocols';
import { TestService } from '@dxos/protocols/dist/src/proto/gen/example/testing/rpc';
import { createProtoRpcPeer } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { Muxer } from './muxer';
import { RpcPort } from './rpc-port';

const setupPeers = () => {
  const peer1 = new Muxer();
  const peer2 = new Muxer();

  peer1.stream.pipe(peer2.stream).pipe(peer1.stream);

  const unpipe = () => {
    peer1.stream.unpipe(peer2.stream);
    peer2.stream.unpipe(peer1.stream);
  };
  afterTest(unpipe);

  return {
    peer1,
    peer2,
    unpipe
  };
};

const createRpc = (port: RpcPort, handler: TestService['testCall']) =>
  createProtoRpcPeer({
    requested: {
      TestService: schema.getService('example.testing.rpc.TestService')
    },
    exposed: {
      TestService: schema.getService('example.testing.rpc.TestService')
    },
    handlers: {
      TestService: {
        testCall: handler,
        voidCall: async () => {}
      }
    },
    port
  });

describe('Muxer', function () {
  it('rpc calls on 1 port', async function () {
    const { peer1, peer2 } = setupPeers();

    const [wait, inc] = latch({ count: 2, timeout: 500 });

    for (const peer of [peer1, peer2]) {
      const client = createRpc(
        peer.createPort('example.extension/rpc', {
          contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
        }),
        async ({ data }) => ({ data })
      );

      setTimeout(async () => {
        await client.open();
        expect(await client.rpc.TestService.testCall({ data: 'test' })).to.deep.eq({ data: 'test' });
        inc();
      });
    }

    await wait();
  });

  it('destroy releases other stream', async function () {
    const { peer1, peer2 } = setupPeers();

    const promise = promiseTimeout(peer1.close.waitForCount(1), 100);

    peer2.destroy();

    await promise;
  });

  it('two concurrent rpc ports', async function () {
    const { peer1, peer2 } = setupPeers();

    const [wait, inc] = latch({ count: 4, timeout: 500 });

    for (const peer of [peer1, peer2]) {
      {
        const client = createRpc(
          peer.createPort('example.extension/rpc1', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
          }),
          async ({ data }) => ({ data: data + '-rpc1' })
        );

        setTimeout(async () => {
          await client.open();
          expect(await client.rpc.TestService.testCall({ data: 'test' })).to.deep.eq({ data: 'test-rpc1' });
          inc();
        });
      }
      {
        const client = createRpc(
          peer.createPort('example.extension/rpc2', {
            contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
          }),
          async ({ data }) => ({ data: data + '-rpc2' })
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
});
