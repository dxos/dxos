//
// Copyright 2022 DXOS.org
//

import snippet from '@segment/snippet';

import { log } from '@dxos/log';
import { captureException } from '@dxos/sentry';

import { type EventOptions, type SegmentTelemetryOptions, type PageOptions } from './types';

export class SegmentTelemetry {
  private _getTags: () => Map<string, string>;

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

  public page({ identityId: userId, ...options }: PageOptions = {}) {
    try {
      (window as any).analytics?.page({
        ...options,
        userId,
      });
    } catch (err) {
      log.catch('Failed to track page', err);
    }
  }

  public event({ identityId: userId, name: event, ...options }: EventOptions) {
    try {
      (window as any).analytics?.track({
        context: Object.fromEntries(this._getTags().entries()),
        ...options,
        event,
      });
    } catch (err) {
      log.catch('Failed to track event', err);
    }
  }

  public async flush() {
    try {
      await (window as any).analytics?.flush((err: any) => {
        captureException(err);
      });
    } catch (err) {
      log.catch('Failed to flush telemetry', err);
    }
  }
}
