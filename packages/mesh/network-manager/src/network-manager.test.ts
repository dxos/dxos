//
// Copyright 2021 DXOS.org
//

import { createTestBroker, TestBroker } from '@dxos/signal';

import { webRTCTests, inMemoryTests } from './network-manager.blueprint-test';

const PORT = 12098;

describe('Network manager', () => {
  describe('WebRTC transport', () => {
    let broker: TestBroker;

    before(async () => {
      broker = await createTestBroker(PORT);
    });

    after(() => {
      broker?.stop();
    });

    webRTCTests({ signalUrl: `ws://localhost:${PORT}/.well-known/dx/signal` });
  }).timeout(10_000);

  describe('In-memory transport', () => {
    inMemoryTests();
  }).timeout(30_000);
});
