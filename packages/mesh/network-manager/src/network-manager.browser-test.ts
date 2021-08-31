//
// Copyright 2021 DXOS.org
//

import { webRTCTests } from './network-manager.blueprint-test';

describe('Network manager', () => {
  describe('WebRTC transport', () => {
    webRTCTests();
  }).timeout(10_000);

  // describe('In-memory transport', () => {
  //   inMemoryTests();
  // }).timeout(30_000);
});
