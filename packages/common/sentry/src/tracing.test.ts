//
// Copyright 2022 DXOS.org
//

// @dxos/test platform=browser

import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';
import { afterAll, beforeAll, describe, test } from '@dxos/test';

import * as Sentry from './init';
import * as Tracing from './tracing';
import { sentryTestkit } from '../testing';

const { testkit, sentryTransport } = sentryTestkit();

// TODO(burdon): https://example.com?
const MOCK_DESTINATION = 'https://acacaeaccacacacabcaacdacdacadaca@sentry.io/000001';

describe('Logger tracing', () => {
  beforeAll(() => {
    Sentry.init({
      destination: MOCK_DESTINATION,
      release: 'test',
      scrubFilenames: true,
      tracing: true,
      transport: sentryTransport,
    });

    Tracing.configureTracing();
  });

  afterAll(() => {
    Tracing.finish();
  });

  test('begin and end span', async () => {
    log.trace('test.trace', {
      span: {
        command: 'begin',
        id: 'test',
      },
    });

    log.trace('test.trace', {
      span: {
        command: 'end',
        id: 'test',
        status: 'error',
      },
      error: new Error('test'),
    });
    // Sleep to allow Sentry tracing to flush.
    await sleep(10);
    Tracing.finish();

    expect(testkit.transactions().length).to.eq(1);
    expect(testkit.transactions()[0].spans[0].op).to.eq('test.trace');
  });
});
