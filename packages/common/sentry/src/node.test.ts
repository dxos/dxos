//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=nodejs

import type { Stacktrace } from '@sentry/types';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { sentryTestkit, TransportFunction } from '../testing';
import * as Sentry from './node';

const { testkit, sentryTransport } = sentryTestkit<TransportFunction>();

const MOCK_DESTINATION = 'https://acacaeaccacacacabcaacdacdacadaca@sentry.io/000001';

describe('Node error reporting', function () {
  before(function () {
    Sentry.init({
      destination: MOCK_DESTINATION,
      release: 'test',
      transport: sentryTransport,
      scrubFilenames: true
    });
  });

  beforeEach(function () {
    testkit.reset();
  });

  it('should scrub stacktraces', async function () {
    const err = new Error('error to look for');
    Sentry.captureException(err);
    await waitForExpect(() => {
      expect(testkit.reports()).to.be.lengthOf(1);
    });
    const report = testkit.findReport(err);
    (report.error?.stacktrace as Stacktrace).frames?.forEach(frame => {
      expect(frame.filename?.includes('/')).to.be.false;
    });
  });
});
