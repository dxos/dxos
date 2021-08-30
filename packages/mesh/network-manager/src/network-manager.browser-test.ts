//
// Copyright 2021 DXOS.org
//

import { WebRTCTest } from './network-manager.blueprint-test';

describe('Network manager', () => {
  describe('WebRTC transport', () => {
    WebRTCTest();
  }).timeout(10_000);

  // describe('In-memory transport', () => {
  //   InMemoryTests();
  // }).timeout(30_000);
});
