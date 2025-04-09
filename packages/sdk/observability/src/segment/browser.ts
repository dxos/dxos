//
// Copyright 2022 DXOS.org
//

import { type IdentifyParams } from '@segment/analytics-node';
import snippet from '@segment/snippet';

import { log } from '@dxos/log';

import { AbstractSegmentTelemetry } from './base';
import type { TrackOptions, SegmentTelemetryOptions, PageOptions } from './types';
import { captureException } from '../sentry';

/**
 * Browser telemetry.
 */
// https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/#basic-tracking-methods
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

  identify(options: IdentifyParams) {
    try {
      (window as any).analytics?.identify(options.userId, options.traits);
    } catch (err) {
      log.catch('failed to identify', err);
    }
  }

  page(options: PageOptions) {
    try {
      const props = this.createPageProps(options);
      (window as any).analytics?.page(props.category, props.name, props.properties);
    } catch (err) {
      log.catch('failed to track page', err);
    }
  }

  track(options: TrackOptions) {
    try {
      const props = this.createTrackProps(options);
      (window as any).analytics?.track(props.event, props.properties);
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
      log.catch('failed to flush telemetry', err);
    }
  }

  async close() {}
}
