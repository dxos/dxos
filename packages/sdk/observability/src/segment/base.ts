//
// Copyright 2025 DXOS.org
//

import { type IdentifyParams, type PageParams, type TrackParams } from '@segment/analytics-node';

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

  abstract identify(options: IdentifyParams): void;

  abstract page(options: PageOptions): void;

  abstract track(options: TrackOptions): void;

  protected createPageParams(options: PageOptions): PageParams {
    const { properties, ...rest } = options;
    return {
      ...getIdentityOptions(options),
      ...rest,
      properties: {
        common: this._getTags(),
        custom: properties,
      },
    };
  }

  protected createTrackParams(options: TrackOptions): TrackParams {
    const { event, action, properties, ...rest } = options;
    return {
      ...getIdentityOptions(options),
      ...rest,
      event: event ?? TelemetryEvent.ACTION,
      properties: {
        action,
        common: this._getTags(),
        custom: properties,
      },
    };
  }
}
