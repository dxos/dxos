//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';

import { Protocol } from '@dxos/mesh-protocol';

import { ProtocolNetworkGenerator } from './protocol-network-generator';

test('basic generator', async () => {
  const generator = new ProtocolNetworkGenerator(async (topic, id) => ({
    id,
    createStream: ({ initiator }) => new Protocol({
      discoveryKey: topic,
      initiator: !!initiator,
      streamOptions: {
        live: true
      }
    })
      .init()
      .stream
  }));

  generator.on('error', err => console.log(err));

  const network = await generator.grid({
    topic: crypto.randomBytes(32),
    parameters: [10, 10]
  });
  expect(network.peers.length).toBe(100);
  expect(network.connections.length).toBe(180);
  await network.destroy();
});
