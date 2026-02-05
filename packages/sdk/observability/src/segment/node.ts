//
// Copyright 2022 DXOS.org
//

import { Analytics, type IdentifyParams } from '@segment/analytics-node';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { captureException } from '../sentry';

import { AbstractSegmentTelemetry } from './base';
import type { PageOptions, SegmentTelemetryOptions, TrackOptions } from './types';

/**
 * Node telemetry.
 */
export class SegmentTelemetry extends AbstractSegmentTelemetry {
  private _analytics?: Analytics;

  constructor({ apiKey, batchSize, getTags }: SegmentTelemetryOptions) {
    super(getTags);
    try {
      invariant(apiKey, 'Missing API key.');
      this._analytics = new Analytics({
        writeKey: apiKey,
        flushAt: batchSize,
      });
    } catch (err) {
      log.catch('Failed to initialize telemetry', err);
    }
  }

  identify(options: IdentifyParams): void {
    if (!this._analytics) {
      log('Analytics not initialized', { action: 'identify' });
      return;
    }

    try {
      this._analytics.identify(options);
    } catch (err) {
      log.catch('Failed to identify', err);
    }
  }

  page(options: PageOptions): void {
    if (!this._analytics) {
      log('Analytics not initialized', { action: 'page' });
      return;
    }

    try {
      this._analytics.page(this.createPageParams(options));
    } catch (err) {
      log.catch('Failed to track page', err);
    }
  }

  track(options: TrackOptions): void {
    if (!this._analytics) {
      log('Analytics not initialized', { action: 'track' });
      return;
    }

    log.info('sending event to telemetry', { options });
    try {
      this._analytics.track(this.createTrackParams(options));
    } catch (err) {
      log.catch('Failed to track action', err);
    }
  }

  async flush(): Promise<void> {
    if (!this._analytics) {
      log('Analytics not initialized', { action: 'flush' });
      return;
    }

    try {
      await this._analytics.flush();
    } catch (err) {
      // are these errors worth capturing?
      captureException(err);
    }
  }

  async close(): Promise<void> {
    if (!this._analytics) {
      return;
    }

    await this._analytics.closeAndFlush();
  }
}
