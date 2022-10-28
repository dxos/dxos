//
// Copyright 2022 DXOS.org
//

import { afterTest } from '@dxos/testutils';
import { createProtoRpcPeer } from '@dxos/rpc';

import { Muxer } from './muxer';
import { schema } from '@dxos/protocols';
import { TestService } from '@dxos/protocols/dist/src/proto/gen/example/testing/rpc';
import { expect } from 'chai';
import { latch } from '@dxos/async';

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

describe('Muxer', function () {
  it('Rpc', async function () {
    const { peer1, peer2 } = setupPeers();

    const [wait, inc] = latch({ count: 2, timeout: 500 })

    for (const peer of [peer1, peer2]) {
      peer.createChannel('dxos.test.extension1', (channel) => {
        const client = createProtoRpcPeer({
          requested: {
            TestService: schema.getService('example.testing.rpc.TestService')
          },
          exposed: {
            TestService: schema.getService('example.testing.rpc.TestService')
          },
          handlers: {
            TestService: {
              testCall: async ({ data }) => {
                return { data };
              },
              voidCall: async () => {}
            }
          },
          port: channel.createPort('dxos.test.extension1', { contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"' })
        });

        setTimeout(async () => {
          await client.open()
          expect(await client.rpc.TestService.testCall({ data: 'test' })).to.deep.eq({ data: 'test' });
          inc()
        });
      });
    }

    await wait();
  });
});
