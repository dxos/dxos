//
// Copyright 2021 DXOS.org
//

// @dxos/mocha nodejs

import { createTestBroker, TestBroker } from '@dxos/signal';

import { webRTCTests, inMemoryTests } from './network-manager.blueprint-test';

const PORT = 12087;

describe('Network manager', function () {
  describe('WebRTC transport', function () {
    let broker: TestBroker;

    before(async function () {
      broker = await createTestBroker(PORT);
    });

    after(function () {
      broker?.stop();
    });

    webRTCTests({ signalUrl: `ws://localhost:${PORT}/.well-known/dx/signal` });
  }).timeout(10_000);

  describe('In-memory transport', function () {
    inMemoryTests();
  }).timeout(30_000);
});
