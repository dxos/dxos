//
// Copyright 2022 DXOS.org
//

import Analytics from 'analytics-node';
import assert from 'node:assert';

import { log } from '@dxos/log';
import { captureException } from '@dxos/sentry';

import { EventOptions, InitOptions, PageOptions } from './types';

let analytics: Analytics | undefined;

/**
 *
 */
export const init = ({ apiKey, batchSize, enable }: InitOptions) => {
  assert(apiKey, 'Key required to send telemetry');

  analytics = new Analytics(apiKey, {
    flushAt: batchSize,
    enable
  });
};

/**
 *
 */
export const page = ({ installationId: anonymousId, identityId: userId, ...options }: PageOptions = {}) => {
  if (!analytics) {
    log.debug('Analytics not initialized', { action: 'page' });
  }

  analytics?.page({
    ...options,
    userId,
    anonymousId
  });
};

/**
 *
 */
export const event = ({ installationId: anonymousId, identityId: userId, name: event, ...options }: EventOptions) => {
  if (!analytics) {
    log.debug('Analytics not initialized', { action: 'event' });
  }

  analytics?.track({
    ...options,
    userId,
    anonymousId,
    event
  });
};

/**
 *
 */
export const flush = async () => {
  if (!analytics) {
    log.debug('Analytics not initialized', { action: 'flush' });
  }

  await analytics?.flush((err) => {
    captureException(err);
  });
};
