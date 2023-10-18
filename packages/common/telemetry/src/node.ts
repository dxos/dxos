//
// Copyright 2022 DXOS.org
//

import Analytics from 'analytics-node';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { tags } from '@dxos/observability';
import { captureException } from '@dxos/sentry';

import { type EventOptions, type InitOptions, type PageOptions } from './types';

let analytics: Analytics | undefined;

/**
 *
 */
export const init = ({ apiKey, batchSize, enable }: InitOptions) => {
  try {
    invariant(apiKey, 'Key required to send telemetry');

    analytics = new Analytics(apiKey, {
      flushAt: batchSize,
      enable,
    });
  } catch (err) {
    log.catch('Failed to initialize telemetry', err);
  }
};

/**
 *
 */
export const page = ({ installationId: anonymousId, identityId: userId, ...options }: PageOptions = {}) => {
  if (!analytics) {
    log('Analytics not initialized', { action: 'page' });
  }

  try {
    analytics?.page({
      ...options,
      userId,
      anonymousId: anonymousId!,
    });
  } catch (err) {
    log.catch('Failed to track page', err);
  }
};

/**
 *
 */
export const event = ({ installationId: anonymousId, identityId: userId, name: event, ...options }: EventOptions) => {
  if (!analytics) {
    log('Analytics not initialized', { action: 'event' });
  }

  try {
    analytics?.track({
      ...options,
      context: tags,
      userId,
      anonymousId: anonymousId!,
      event,
    });
  } catch (err) {
    log.catch('Failed to track event', err);
  }
};

/**
 *
 */
export const flush = async () => {
  if (!analytics) {
    log('Analytics not initialized', { action: 'flush' });
  }

  try {
    await analytics?.flush((err) => {
      captureException(err);
    });
  } catch (err) {
    log.catch('Failed to flush', err);
  }
};
