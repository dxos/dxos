//
// Copyright 2021 DXOS.org
//

import { describe } from '@dxos/test';

import { TEST_SIGNAL_HOSTS, TestBuilder } from '../testing';
import { basicTestSuite } from './basic-test-suite';

describe('WebRTC transport', () => {
  const testBuilder = new TestBuilder();
  basicTestSuite(testBuilder);
}).timeout(10_000);

describe('WebRTC transport proxy', () => {
  const testBuilder = new TestBuilder({ bridge: true });
  basicTestSuite(testBuilder);
}).timeout(10_000);

describe('test with signal server', () => {
  describe('WebRTC transport', () => {
    const testBuilder = new TestBuilder({ signalHosts: TEST_SIGNAL_HOSTS });
    basicTestSuite(testBuilder);
  }).timeout(10_000);

  describe('WebRTC transport proxy', () => {
    const testBuilder = new TestBuilder({ signalHosts: TEST_SIGNAL_HOSTS, bridge: true });
    basicTestSuite(testBuilder);
  }).timeout(10_000);
});
