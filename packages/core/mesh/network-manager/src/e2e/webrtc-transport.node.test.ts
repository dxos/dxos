//
// Copyright 2025 DXOS.org
//

import { describe } from 'vitest';

import { TestBuilder } from '../testing';
import { basicTestSuite } from '../tests/basic-test-suite';
import { TransportKind } from '../transport';

describe.runIf(process.env.DX_RUN_NETWORK_MANAGER_E2E === '1')('Transport E2E Test', () => {
  describe('WebRTC transport', { timeout: 10_000 }, () => {
    const testBuilder = new TestBuilder({ useEdgeSignaling: true, transport: TransportKind.WEB_RTC });
    basicTestSuite(testBuilder);
  });

  describe('WebRTC transport proxy', { timeout: 10_000 }, () => {
    const testBuilder = new TestBuilder({
      useEdgeSignaling: true,
      transport: TransportKind.WEB_RTC_PROXY,
    });
    basicTestSuite(testBuilder);
  });
}); 
