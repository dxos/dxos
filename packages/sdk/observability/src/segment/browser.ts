//
// Copyright 2022 DXOS.org
//

import snippet from '@segment/snippet';

import { log } from '@dxos/log';

import { AbstractSegmentTelemetry } from './base';
import type { TrackOptions, SegmentTelemetryOptions, PageOptions } from './types';
import { captureException } from '../sentry';

/**
 * Browser telemetry.
 */
export class SegmentTelemetry extends AbstractSegmentTelemetry {
  constructor({ apiKey, batchSize, getTags }: SegmentTelemetryOptions) {
    super(getTags);
    try {
      const contents = snippet.min({ apiKey, page: false });
      const script = document.createElement('script');
      script.innerHTML = contents;
      document.body.append(script);
    } catch (err) {
      log.catch('failed to initialize telemetry', err);
    }
  }

  page(options: PageOptions) {
    try {
      (window as any).analytics?.page(this.createPageProps(options));
    } catch (err) {
      log.catch('failed to track page', err);
    }
  }

  track(options: TrackOptions) {
    try {
      (window as any).analytics?.track(this.createTrackProps(options));
    } catch (err) {
      log.catch('failed to track event', err);
    }
  }

  async flush() {
    try {
      await (window as any).analytics?.flush((err: any) => {
        captureException(err);
      });
    } catch (err) {
      log.catch('Failed to flush telemetry', err);
    }
  }

  async close() {}
}
