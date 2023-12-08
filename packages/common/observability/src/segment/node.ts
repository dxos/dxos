//
// Copyright 2022 DXOS.org
//

import Analytics from 'analytics-node';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { captureException } from '@dxos/sentry';

import { type EventOptions, type SegmentTelemetryOptions, type PageOptions } from './types';

export class SegmentTelemetry {
  private _analytics?: Analytics;
  private _getTags: () => Map<string, string>;

  constructor({ apiKey, batchSize, getTags }: SegmentTelemetryOptions) {
    this._getTags = getTags;
    try {
      invariant(apiKey, 'Key required to send telemetry');

      this._analytics = new Analytics(apiKey, {
        flushAt: batchSize,
        enable: true,
      });
    } catch (err) {
      log.catch('Failed to initialize telemetry', err);
    }
  }

  /**
   *
   */
  public page({ installationId: anonymousId, identityId: userId, ...options }: PageOptions = {}) {
    if (!this._analytics) {
      log('Analytics not initialized', { action: 'page' });
    }

    try {
      this._analytics?.page({
        ...options,
        userId,
        anonymousId: anonymousId!,
      });
    } catch (err) {
      log.catch('Failed to track page', err);
    }
  }

  /**
   *
   */
  public event({ installationId: anonymousId, identityId: userId, name: event, ...options }: EventOptions) {
    log('sending event to telemetry', { event, options, tags: Object.fromEntries(this._getTags().entries()) });
    if (!this._analytics) {
      log('Analytics not initialized', { action: 'event' });
    }

    try {
      this._analytics?.track({
        ...options,
        context: Object.fromEntries(this._getTags().entries()),
        userId,
        anonymousId: anonymousId!,
        event,
      });
    } catch (err) {
      log.catch('Failed to track event', err);
    }
  }

  /**
   *
   */
  public async flush() {
    if (!this._analytics) {
      log('Analytics not initialized', { action: 'flush' });
    }

    try {
      await this._analytics?.flush((err) => {
        captureException(err);
      });
    } catch (err) {
      log.catch('Failed to flush', err);
    }
  }
}
