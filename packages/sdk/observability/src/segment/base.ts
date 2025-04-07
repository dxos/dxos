//
// Copyright 2025 DXOS.org
//

import { type TrackParams, type PageParams } from '@segment/analytics-node';

import { invariant } from '@dxos/invariant';

import {
  Event,
  type PageOptions,
  type TrackOptions,
  type Tags,
  type IdentityOptions,
  type SegmentIdentityOptions,
} from './types';

const getIdentityOptions = ({ did, installationId }: IdentityOptions): SegmentIdentityOptions => {
  invariant(did != null || installationId != null, 'Either did or installationId is required');
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
      event: event ?? Event.USER,
      context: this._getTags(),
      properties: {
        action,
        custom: properties,
      },
    };
  }
}
