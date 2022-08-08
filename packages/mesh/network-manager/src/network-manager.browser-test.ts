//
// Copyright 2021 DXOS.org
//

import { inMemoryTests, webRTCTests } from './network-manager.blueprint-test';

describe('Network manager', () => {
  describe('WebRTC transport', () => {
    webRTCTests({ signalUrl: 'ws://localhost:12098/.well-known/dx/signal' });
  }).timeout(10_000);

  // TODO(marik-d): In-memory tests seem to be broken in the browser. Need more investigation.
  describe.skip('In-memory transport', () => {
    inMemoryTests();
  }); // code .timeout(30_000);
});
