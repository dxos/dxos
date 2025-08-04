//
// Copyright 2022 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';
import { TestBuilder } from '@dxos/teleport/testing';
import { range } from '@dxos/util';

import { TestAgent } from './testing';

describe.skip('Presence stress-test ', () => {
  test('N peers chain', async () => {
    const amountOfPeers = 80;

    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());

    const peers: TestAgent[] = [];

    // Create peers.
    for (const _ in range(amountOfPeers)) {
      peers.push(
        builder.createPeer({
          factory: () => new TestAgent({ announceInterval: 500, offlineTimeout: 5_000 }),
        }),
      );
    }

    // Connect peers in chain.
    // peers[0] <-> peers[1] <-> peers[2] <-> ... <-> peers[amountOfPeers - 1].
    for (const [index, peer] of peers.entries()) {
      const nextPeer = peers[index + 1];
      if (nextPeer) {
        await builder.connect(peer, nextPeer);
      }
    }

    log('All peers are connected.');

    // Wait for all peers to be online.
    await sleep(10_000);

    // Check if peers on the ends see each other.
    await peers[0].waitForAgentsOnline([peers[amountOfPeers - 1]], 500);
    await peers[amountOfPeers - 1].waitForAgentsOnline([peers[0]], 500);
  });
});
