//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';

import { Protocol } from '@dxos/protocol';

import { ProtocolNetworkGenerator } from './protocol-network-generator';

test('basic generator', async () => {
  const generator = new ProtocolNetworkGenerator(async (topic, id) => {
    return {
      id,
      createStream () {
        return new Protocol({
          streamOptions: {
            live: true
          }
        })
          .init(topic)
          .stream;
      }
    };
  });

  generator.on('error', err => console.log(err));

  const network = await generator.grid({
    topic: crypto.randomBytes(32),
    parameters: [10, 10]
  });
  expect(network.peers.length).toBe(100);
  expect(network.connections.length).toBe(180);
  await network.destroy();
});
