//
// Copyright 2022 DXOS.org
//

export type Tags = Record<string, string>;

export type SegmentTelemetryOptions = {
  apiKey?: string;
  batchSize?: number;
  enable?: boolean;
  getTags: () => Tags;
};

// Copied from @segment/analytics-node.
export type SegmentIdentityOptions =
  | { userId: string; anonymousId?: string }
  | { userId?: string; anonymousId: string };

// TODO(burdon): Should require one or the other.
export type IdentityOptions = { did?: string; installationId?: string };

export type CommonOptions = IdentityOptions & {
  timestamp?: Date;
  properties?: Record<string, unknown>;
};

/**
 * Page views.
 * https://segment.com/docs/connections/sources/catalog/libraries/server/node/#page
 */
export type PageOptions = CommonOptions & {
  category?: string;
  name?: string;
};

/**
 * Track actions.
 * https://segment.com/docs/connections/sources/catalog/libraries/server/node/#track
 */
export type TrackOptions = CommonOptions & {
  event?: TelemetryEvent;
  action: string;
};

/**
 * Each event will be mapped to a different Postgres table via segment.
 */
export enum TelemetryEvent {
  /**
   * Use actions.
   */
  ACTION = 'action',
  /**
   * High-volume technical metrics.
   */
  METRICS = 'metrics',
}
