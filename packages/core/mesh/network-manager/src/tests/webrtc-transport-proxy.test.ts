//
// Copyright 2021 DXOS.org
//

import { TEST_SIGNAL_URL, TestBuilder } from '../testing';
import { testSuite } from './test-suite';

describe('WebRTC transport proxy', function () {
  const testBuilder = new TestBuilder({ signalHosts: [TEST_SIGNAL_URL], bridge: true });
  testSuite(testBuilder, true);
}).timeout(10_000);
