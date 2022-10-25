//
// Copyright 2022 DXOS.org
//

import Analytics from 'analytics-node';
import assert from 'node:assert';

import { captureException } from '@dxos/sentry';

import { EventOptions, InitOptions, PageOptions } from './types';

let analytics: Analytics;

/**
 *
 */
export const init = (options: InitOptions) => {
  const apiKey = options.apiKey ?? process.env.DXOS_TELEMETRY_KEY;
  assert(apiKey, 'Key required to send telemetry');

  analytics = new Analytics(apiKey, {
    flushAt: options.batchSize,
    enable: options.enable
  });
};

/**
 *
 */
export const page = ({ machineId, identityId: anonymousId, ...options }: PageOptions) => {
  assert(analytics, 'Analytics not initialized');

  analytics.page({
    ...options,
    anonymousId,
    properties: {
      ...options.properties,
      machineId
    }
  });
};

/**
 *
 */
export const event = ({ machineId, identityId: anonymousId, name: event, ...options }: EventOptions) => {
  assert(analytics, 'Analytics not initialized');

  analytics.track({
    ...options,
    anonymousId,
    event,
    properties: {
      ...options.properties,
      machineId
    }
  });
};

/**
 *
 */
export const flush = async () => {
  assert(analytics, 'Analytics not initialized');

  await analytics.flush((err) => {
    captureException(err);
  });
};
