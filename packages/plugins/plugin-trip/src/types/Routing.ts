//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';

import { Place } from './Place';

/**
 * Transient routing types shared by plugin-trip and routing-service implementations
 * (e.g. plugin-osrm). These are NOT ECHO objects — they are plain Effect schemas / interfaces
 * passed across the `RoutingService` capability boundary. The shape parallels `BookingSearch`.
 */

/** Routing profile. Today only `driving`; reserved for `walking` / `cycling`. */
export const RouteProfile = Schema.Literal('driving');
export type RouteProfile = Schema.Schema.Type<typeof RouteProfile>;

/**
 * A stop on a route: either a resolved `Place` (which may already carry `geo`) or a free-text
 * place name that the routing service geocodes internally.
 */
export const Waypoint = Schema.Union(Place, Schema.String);
export type Waypoint = Schema.Schema.Type<typeof Waypoint>;

/** Returns a human label for a waypoint (place name / city / code, or the raw string). */
export const waypointLabel = (waypoint: Waypoint): string =>
  typeof waypoint === 'string' ? waypoint : (waypoint.name ?? waypoint.city ?? waypoint.code ?? '');

export const RouteQuery = Schema.Struct({
  /** Ordered stops; at least two are required to produce a leg. */
  waypoints: Schema.Array(Waypoint),
  profile: Schema.optional(RouteProfile),
});
export interface RouteQuery extends Schema.Schema.Type<typeof RouteQuery> {}

/** One leg between two consecutive (geocoded) waypoints. */
export const RouteLeg = Schema.Struct({
  origin: Place,
  destination: Place,
  distanceMeters: Schema.Number,
  durationSeconds: Schema.Number,
  /** Decoded polyline as `[lon, lat]` points. */
  path: Schema.Array(Format.GeoPoint),
});
export interface RouteLeg extends Schema.Schema.Type<typeof RouteLeg> {}

export const RouteResult = Schema.Struct({
  /** One leg per consecutive waypoint pair (`waypoints.length - 1`). */
  legs: Schema.Array(RouteLeg),
  distanceMeters: Schema.Number,
  durationSeconds: Schema.Number,
});
export interface RouteResult extends Schema.Schema.Type<typeof RouteResult> {}

/**
 * A pluggable driving-route provider. Plugins contribute implementations via the
 * `TripCapabilities.RoutingService` capability; `PlanRoute` resolves them. The service is
 * responsible for geocoding any name-only waypoints internally.
 */
export interface RoutingService {
  readonly id: string;
  readonly label: string;
  readonly profiles: readonly RouteProfile[];
  route(query: RouteQuery): Promise<RouteResult>;
}

/** Thrown by a `RoutingService` when its credentials are not configured. */
export class MissingApiKeyError extends Error {
  constructor(public readonly serviceId: string) {
    super(`Missing API key for routing service: ${serviceId}`);
    this.name = 'MissingApiKeyError';
  }
}

/** Thrown when a waypoint name cannot be resolved to coordinates. */
export class GeocodeError extends Error {
  constructor(public readonly location: string) {
    super(`Could not find location: ${location}`);
    this.name = 'GeocodeError';
  }
}

/** Thrown when route computation fails. */
export class RouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteError';
  }
}
