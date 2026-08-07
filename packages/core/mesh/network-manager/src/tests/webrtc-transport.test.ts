//
// Copyright 2021 DXOS.org
//

import { describe } from 'vitest';

import { TestBuilder } from '../testing';
import { TransportKind } from '../transport';
import { basicTestSuite } from './basic-test-suite';

// Segfault in node-datachannel.
describe.skip('WebRTC transport', { timeout: 10_000 }, () => {
  const testBuilder = new TestBuilder({ transport: TransportKind.WEB_RTC });
  basicTestSuite(testBuilder);
});

// Segfault in node-datachannel.
describe.skip('WebRTC transport proxy', { timeout: 10_000 }, () => {
  const testBuilder = new TestBuilder({ transport: TransportKind.WEB_RTC_PROXY });
  basicTestSuite(testBuilder);
});
