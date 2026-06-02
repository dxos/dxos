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

//
// Route — the computed driving route, stored inline on `RoadDetails.routes` and returned by the
// service. Minimal mirror of the OSRM response (geometry + per-leg distance/duration/summary/steps).
//

/** A turn/segment within a leg. */
export const RouteStep = Schema.Struct({
  name: Schema.optional(Schema.String),
  ref: Schema.optional(Schema.String),
});
export interface RouteStep extends Schema.Schema.Type<typeof RouteStep> {}

/** A leg between two consecutive route waypoints. `geometry` is the decoded `[lon, lat]` polyline. */
export const RouteLeg = Schema.Struct({
  distance: Schema.Number,
  duration: Schema.Number,
  summary: Schema.optional(Schema.String),
  geometry: Schema.Array(Format.GeoPoint),
  steps: Schema.Array(RouteStep),
});
export interface RouteLeg extends Schema.Schema.Type<typeof RouteLeg> {}

/** A computed route. `geometry` is the concatenation of its legs' geometry. */
export const Route = Schema.Struct({
  distance: Schema.Number,
  duration: Schema.Number,
  geometry: Schema.Array(Format.GeoPoint),
  legs: Schema.Array(RouteLeg),
});
export interface Route extends Schema.Schema.Type<typeof Route> {}

/** Builds a Route from its legs, computing total distance/duration and the concatenated geometry. */
export const makeRoute = (legs: readonly RouteLeg[]): Route => ({
  distance: legs.reduce((sum, leg) => sum + leg.distance, 0),
  duration: legs.reduce((sum, leg) => sum + leg.duration, 0),
  geometry: legs.flatMap((leg) => [...leg.geometry]),
  legs: [...legs],
});

export const RouteResult = Schema.Struct({
  /** Geocoded stops, index-aligned with the query waypoints. */
  waypoints: Schema.Array(Place),
  /** Route alternatives (usually one). */
  routes: Schema.Array(Route),
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
