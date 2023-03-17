//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

describe('Stress test Presence', () => {
  test('1000 peers chain', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const [agent1, agent2, agent3, agent4] = builder.createPeers({
      factory: () => new TestAgent({ announceInterval: 10, offlineTimeout: 50 })
    });
  });
});
