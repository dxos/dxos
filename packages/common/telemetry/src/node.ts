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
export const page = ({ installationId, identityId: anonymousId, ...options }: PageOptions) => {
  if (!analytics) {
    log.debug('Analytics not inialized', { action: 'page' });
  }

  analytics?.page({
    ...options,
    anonymousId,
    properties: {
      ...options.properties,
      installationId
    }
  });
};

/**
 *
 */
export const event = ({ installationId, identityId: anonymousId, name: event, ...options }: EventOptions) => {
  if (!analytics) {
    log.debug('Analytics not inialized', { action: 'event' });
  }

  analytics?.track({
    ...options,
    anonymousId,
    event,
    properties: {
      ...options.properties,
      installationId
    }
  });
};

/**
 *
 */
export const flush = async () => {
  if (!analytics) {
    log.debug('Analytics not inialized', { action: 'flush' });
  }

  await analytics?.flush((err) => {
    captureException(err);
  });
};
