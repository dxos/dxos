//
// Copyright 2021 DXOS.org
//

import { describe } from 'vitest';

import { basicTestSuite } from './basic-test-suite';
import { TestBuilder } from '../testing';
import { TransportKind } from '../transport';

describe('Memory transport', { timeout: 10_000 }, () => {
  const testBuilder = new TestBuilder({ transport: TransportKind.MEMORY });
  basicTestSuite(testBuilder);
});

describe('WebRTC transport', { timeout: 10_000 }, () => {
  const testBuilder = new TestBuilder({ transport: TransportKind.WEB_RTC });
  basicTestSuite(testBuilder);
});

describe('WebRTC transport proxy', { timeout: 10_000 }, () => {
  const testBuilder = new TestBuilder({ transport: TransportKind.WEB_RTC_PROXY });
  basicTestSuite(testBuilder);
});
