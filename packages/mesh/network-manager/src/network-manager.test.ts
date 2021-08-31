//
// Copyright 2021 DXOS.org
//

import { Awaited } from '@dxos/async';
import { createTestBroker } from '@dxos/signal';

import { webRTCTest, inMemoryTests } from './network-manager.blueprint-test';

describe('Network manager', () => {
  describe('WebRTC transport', () => {
    let broker: Awaited<ReturnType<typeof createTestBroker>>;

    before(async function () {
      broker = await createTestBroker(12098);
    });

    after(async function () {
      await broker?.stop();
    });

    webRTCTest();
  }).timeout(10_000);

  describe('In-memory transport', () => {
    inMemoryTests();
  }).timeout(30_000);
});
