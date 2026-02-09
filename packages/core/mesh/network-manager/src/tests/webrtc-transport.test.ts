//
// Copyright 2021 DXOS.org
//

import { describe } from 'vitest';

import { TEST_SIGNAL_HOSTS, TestBuilder } from '../testing';

import { basicTestSuite } from './basic-test-suite';

// Segfault in node-datachannel.
describe.skip('WebRTC transport', { timeout: 10_000 }, () => {
  const testBuilder = new TestBuilder();
  basicTestSuite(testBuilder);
});

// Segfault in node-datachannel.
describe.skip('WebRTC transport proxy', { timeout: 10_000 }, () => {
  const testBuilder = new TestBuilder({ bridge: true });
  basicTestSuite(testBuilder);
});

describe.skip('test with signal server', () => {
  describe('WebRTC transport', { timeout: 10_000 }, () => {
    const testBuilder = new TestBuilder({ signalHosts: TEST_SIGNAL_HOSTS });
    basicTestSuite(testBuilder);
  });

  describe('WebRTC transport proxy', { timeout: 10_000 }, () => {
    const testBuilder = new TestBuilder({ signalHosts: TEST_SIGNAL_HOSTS, bridge: true });
    basicTestSuite(testBuilder);
  });
});
