//
// Copyright 2021 DXOS.org
//

// @dxos/mocha browser

import { inMemoryTests, webRTCTests } from './network-manager.blueprint-test';

describe('Network manager', function () {
  describe('WebRTC transport', function () {
    webRTCTests({ signalUrl: 'ws://localhost:4000/.well-known/dx/signal' });
  }).timeout(10_000);

  // TODO(marik-d): In-memory tests seem to be broken in the browser. Need more investigation.
  describe.skip('In-memory transport', function () {
    inMemoryTests();
  }); // code .timeout(30_000);
});
