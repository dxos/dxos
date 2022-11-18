//
// Copyright 2021 DXOS.org
//

import { TEST_SIGNAL_URL, TestBuilder } from '../testing';
import { basicTestSuite } from './basic-test-suite';

describe('WebRTC transport', function () {
  const testBuilder = new TestBuilder({ signalHosts: [TEST_SIGNAL_URL] });
  basicTestSuite(testBuilder);
}).timeout(10_000);

describe('WebRTC transport proxy', function () {
  const testBuilder = new TestBuilder({ signalHosts: [TEST_SIGNAL_URL], bridge: true });
  basicTestSuite(testBuilder);
}).timeout(10_000);
