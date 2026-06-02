//
// Copyright 2026 DXOS.org
//

import { Place, Routing } from '#types';

/** Coordinates ([lon, lat]) for cities used across routing stories and tests. */
export const CITY_COORDS: Record<string, [number, number]> = {
  london: [-0.1276, 51.5074],
  avignon: [4.8055, 43.9493],
  barcelona: [2.1734, 41.3851],
  oxford: [-1.2577, 51.752],
  bath: [-2.3597, 51.3781],
  paris: [2.3522, 48.8566],
  lyon: [4.8357, 45.764],
};

const normalize = (name: string): string => name.trim().toLowerCase();

const EARTH_RADIUS_M = 6_371_000;
const AVG_SPEED_MPS = 80_000 / 3600; // ~80 km/h.
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** A `[lon, lat]` point (matching `Format.GeoPoint`, whose altitude is optional). */
type GeoTuple = readonly [number, number, (number | undefined)?];

/** Great-circle distance in meters between two `[lon, lat]` points. */
const haversine = (a: GeoTuple, b: GeoTuple): number => {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

export type FakeRoutingOptions = {
  /** City name (case-insensitive) → `[lon, lat]`. Defaults to {@link CITY_COORDS}. */
  coords?: Record<string, [number, number]>;
  /** Service id. */
  id?: string;
};

/**
 * Deterministic synchronous route computation: geocodes known city names from a fixed table
 * (already-resolved Places pass through unchanged), producing straight two-point legs with a
 * haversine distance and a constant-speed duration. Unknown names throw `GeocodeError`.
 */
export const fakeRoute = (
  waypoints: readonly Routing.Waypoint[],
  options: FakeRoutingOptions = {},
): Routing.RouteResult => {
  const coords = options.coords ?? CITY_COORDS;
  const resolve = (waypoint: Routing.Waypoint): Place.Place => {
    if (typeof waypoint !== 'string') {
      return waypoint;
    }
    const geo = coords[normalize(waypoint)];
    if (!geo) {
      throw new Routing.GeocodeError(waypoint);
    }
    return { name: waypoint, city: waypoint, geo };
  };

  const places = waypoints.map(resolve);
  const legs: Routing.RouteLeg[] = [];
  for (let index = 0; index < places.length - 1; index++) {
    const origin = places[index];
    const destination = places[index + 1];
    const path = [origin.geo, destination.geo].filter((point): point is NonNullable<typeof point> => point != null);
    const distanceMeters = path.length === 2 ? haversine(path[0], path[1]) : 0;
    legs.push({ origin, destination, distanceMeters, durationSeconds: distanceMeters / AVG_SPEED_MPS, path });
  }
  return {
    legs,
    distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
    durationSeconds: legs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
  };
};

/**
 * Deterministic in-memory `RoutingService` for stories and tests. Wraps {@link fakeRoute}; unknown
 * city names reject with `GeocodeError`.
 */
export const fakeRoutingService = (options: FakeRoutingOptions = {}): Routing.RoutingService => ({
  id: options.id ?? 'fake',
  label: 'Fake routing',
  profiles: ['driving'],
  route: async ({ waypoints }) => fakeRoute(waypoints, options),
});
