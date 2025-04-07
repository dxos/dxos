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

export type IdentityOptions = { did: string; installationId?: string } | { did?: string; installationId: string };

export type CommonOptions = IdentityOptions & {
  timestamp?: Date;
  properties?: Record<string, unknown>; // TODO(burdon): Rename custom.
};

/**
 * Page views.
 * https://segment.com/docs/connections/sources/catalog/libraries/server/node/#page
 */
export type PageOptions = CommonOptions & {
  category?: string;
  name: string;
};

/**
 * Track actions.
 * https://segment.com/docs/connections/sources/catalog/libraries/server/node/#track
 */
export type TrackOptions = CommonOptions & {
  event?: Event;
  action: string;
};

/**
 * Each event will be mapped to a different Postgres table via segment.
 */
export enum Event {
  USER = 'user',
}
