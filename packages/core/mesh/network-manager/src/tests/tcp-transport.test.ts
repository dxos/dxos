//
// Copyright 2021 DXOS.org
//

import { randomBytes } from 'crypto';

import { PublicKey } from '@dxos/keys';
import { test, describe } from 'vitest';
import { range } from '@dxos/util';

import { basicTestSuite } from './basic-test-suite';
import { exchangeMessages, joinSwarm, leaveSwarm, openAndCloseAfterTest } from './utils';
import { TestBuilder } from '../testing';
import { FullyConnectedTopology } from '../topology';
import { TransportKind } from '../transport';

describe('Tcp transport', () => {
  const testBuilder = new TestBuilder({
    transport: TransportKind.TCP,
  });

  basicTestSuite(testBuilder);

  test.skip(
    'load',
    async () => {
      const NUM_PAIRS = 100;
      const NUM_ROUNDS = 10_000;
      const PACKET_SIZE = 1_000;

      const pairs = await Promise.all(
        range(NUM_PAIRS).map(async () => {
          const peer1 = testBuilder.createPeer();
          const peer2 = testBuilder.createPeer();
          await openAndCloseAfterTest([peer1, peer2]);

          const topic = PublicKey.random();
          const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic, () => new FullyConnectedTopology());

          return {
            peer1,
            peer2,
            topic,
            swarm1,
            swarm2,
          };
        }),
      );

      const message = randomBytes(PACKET_SIZE / 2).toString('hex');

      for (let i = 0; i < NUM_ROUNDS; i++) {
        // console.log(`Round ${i}/${NUM_ROUNDS}`);
        await Promise.all(
          pairs.map(async ({ swarm1, swarm2 }) => {
            await exchangeMessages(swarm1, swarm2, message);
          }),
        );
      }

      await Promise.all(
        pairs.map(async ({ peer1, peer2, topic }) => {
          await leaveSwarm([peer1, peer2], topic);
        }),
      );
    },
    { timeout: 1_000_000 },
  );
});
