//
// Copyright 2025 DXOS.org
//

import { type TrackParams, type PageParams } from '@segment/analytics-node';

import { log } from '@dxos/log';

import {
  type IdentityOptions,
  type PageOptions,
  type SegmentIdentityOptions,
  type Tags,
  TelemetryEvent,
  type TrackOptions,
} from './types';

/**
 * NOTE: Segment provides a default ID if we don't provide one.
 */
const getIdentityOptions = ({ did, installationId }: IdentityOptions): SegmentIdentityOptions => {
  if (!did && !installationId) {
    log.warn('No telemetry identifier provided.');
  }

  return {
    userId: did,
    anonymousId: installationId,
  } as SegmentIdentityOptions;
};

/**
 * Base class for Node and BrowserSegment telemetry.
 */
export abstract class AbstractSegmentTelemetry {
  constructor(private readonly _getTags: () => Tags) {}

  abstract page(options: PageOptions): void;

  abstract track(options: TrackOptions): void;

  protected createPageProps(options: PageOptions): PageParams {
    const { properties, ...rest } = options;
    return {
      ...getIdentityOptions(options),
      ...rest,
      context: this._getTags(),
      properties: {
        custom: properties,
      },
    };
  }

  protected createTrackProps(options: TrackOptions): TrackParams {
    const { event, action, properties, ...rest } = options;
    return {
      ...getIdentityOptions(options),
      ...rest,
      event: event ?? TelemetryEvent.ACTION,
      context: this._getTags(),
      properties: {
        action,
        custom: properties,
      },
    };
  }
}
