//
// Copyright 2022 DXOS.org
//

import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { sentryTestkit } from '../testing';

import * as Sentry from './node';

const { testkit, sentryTransport } = sentryTestkit();

const MOCK_DESTINATION = 'https://acacaeaccacacacabcaacdacdacadaca@sentry.io/000001';

describe('Error reporting', () => {
  beforeAll(() => {
    Sentry.init({
      destination: MOCK_DESTINATION,
      release: 'test',
      transport: sentryTransport,
    });
  });

  beforeEach(() => {
    testkit.reset();
  });

  test('should capture errors', async () => {
    const err = new Error('error to look for');
    Sentry.captureException(err);
    await expect.poll(() => testkit.reports()).toHaveLength(1);
    const report = testkit.findReport(err);
    expect(report).to.exist;
  });
});
