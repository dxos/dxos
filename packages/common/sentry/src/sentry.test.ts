//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { beforeAll, beforeEach, describe, test } from '@dxos/test';

import * as Sentry from './node';
import { sentryTestkit } from '../testing';

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
    await waitForExpect(() => {
      expect(testkit.reports()).to.be.lengthOf(1);
    });
    const report = testkit.findReport(err);
    expect(report).to.exist;
  });
});
