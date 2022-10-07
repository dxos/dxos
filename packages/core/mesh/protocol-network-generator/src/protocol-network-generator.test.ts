//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import crypto from 'crypto';

import { Protocol } from '@dxos/mesh-protocol';

import { ProtocolNetworkGenerator } from './protocol-network-generator';

it('basic generator', async function () {
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
  expect(network.peers.length).to.equal(100);
  expect(network.connections.length).to.equal(180);
  await network.destroy();
});
