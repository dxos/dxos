//
// Copyright 2022 DXOS.org
//

import type { Stacktrace } from '@sentry/types';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { sentryTestkit } from '../testing';

import * as Sentry from './node';

const { testkit, sentryTransport } = sentryTestkit();

// TODO(burdon): https://example.com?
const MOCK_DESTINATION = 'https://acacaeaccacacacabcaacdacdacadaca@sentry.io/000001';

describe('Node error reporting', () => {
  beforeAll(() => {
    Sentry.init({
      destination: MOCK_DESTINATION,
      release: 'test',
      transport: sentryTransport,
      scrubFilenames: true,
    });
  });

  beforeEach(() => {
    testkit.reset();
  });

  test('should scrub stacktraces', async () => {
    const err = new Error('error to look for');
    Sentry.captureException(err);
    await expect.poll(() => testkit.reports()).toHaveLength(1);
    const report = testkit.findReport(err);
    (report?.error?.stacktrace as Stacktrace).frames?.forEach((frame) => {
      expect(frame.filename?.includes('/')).to.be.false;
    });
  });
});
