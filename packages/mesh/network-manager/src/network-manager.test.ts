//
// Copyright 2021 DXOS.org
//

import { createTestBroker, TestBroker } from '@dxos/signal';

import { webRTCTests, inMemoryTests } from './network-manager.blueprint-test';

describe('Network manager', () => {
  describe('WebRTC transport', () => {
    let broker: TestBroker;
    const port = 12098;

    before(async () => {
      broker = await createTestBroker(port);
    });

    after(async () => {
      await broker?.stop();
    });

    webRTCTests({ signalUrl: `ws://localhost:${port}/.well-known/dx/signal` });
  }).timeout(10_000);

  describe('In-memory transport', () => {
    inMemoryTests();
  }).timeout(30_000);
});
