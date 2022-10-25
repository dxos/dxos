//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { sentryTestkit, TransportFunction } from '../testing';
import * as Sentry from './node';

const { testkit, sentryTransport } = sentryTestkit<TransportFunction>();

const MOCK_DESTINATION =
  'https://acacaeaccacacacabcaacdacdacadaca@sentry.io/000001';

describe('Error reporting', function () {
  before(function () {
    Sentry.init({
      destination: MOCK_DESTINATION,
      release: 'test',
      transport: sentryTransport
    });
  });

  beforeEach(function () {
    testkit.reset();
  });

  it('should capture errors', async function () {
    const err = new Error('error to look for');
    Sentry.captureException(err);
    await waitForExpect(() => {
      expect(testkit.reports()).to.be.lengthOf(1);
    });
    const report = testkit.findReport(err);
    expect(report).to.exist;
  });
});
