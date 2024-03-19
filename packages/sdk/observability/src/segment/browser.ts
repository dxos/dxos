//
// Copyright 2022 DXOS.org
//

import snippet from '@segment/snippet';

import { log } from '@dxos/log';

import type { EventOptions, SegmentTelemetryOptions, PageOptions } from './types';
import { captureException } from '../sentry';

export class SegmentTelemetry {
  private _getTags: () => { [key: string]: string };

  constructor({ apiKey, batchSize, getTags }: SegmentTelemetryOptions) {
    this._getTags = getTags;
    try {
      const contents = snippet.min({
        apiKey,
        page: false,
      });

      const script = document.createElement('script');
      script.innerHTML = contents;
      document.body.append(script);
    } catch (err) {
      log.catch('Failed to initialize telemetry', err);
    }
  }

  page({ identityId: userId, ...options }: PageOptions = {}) {
    try {
      (window as any).analytics?.page({
        context: this._getTags(),
        ...options,
        userId,
      });
    } catch (err) {
      log.catch('Failed to track page', err);
    }
  }

  event({ identityId: userId, name: event, ...options }: EventOptions) {
    try {
      options.properties = {
        ...options.properties,
        ...this._getTags(),
      };
      (window as any).analytics?.track({
        ...options,
        event,
      });
    } catch (err) {
      log.catch('Failed to track event', err);
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
