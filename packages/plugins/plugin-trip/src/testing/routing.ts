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
 * Real driving geometry captured once from the public OSRM demo (`overview=simplified`), keyed by
 * `${from}>${to}` (lower-case). Lets the deterministic fake router return a true road-following
 * polyline for the showcase cities instead of a straight line. Paths are space-separated `lon,lat`.
 */
const ROUTE_FIXTURES: Record<string, { distanceMeters: number; durationSeconds: number; path: string }> = {
  'london>avignon': {
    distanceMeters: 1_302_979,
    durationSeconds: 68_378,
    path: '-0.12759,51.50758 -0.64529,51.21561 -0.7207,51.11384 -0.90217,51.05725 -1.01269,50.84607 -1.11285,50.80823 -1.02704,50.68559 -1.59624,49.58685 -1.36867,49.47421 -1.2125,49.30562 -0.95779,49.34406 -0.29257,49.16719 0.52693,49.39453 1.06508,49.34165 1.47008,49.03058 1.91684,48.96874 2.1577,48.782 2.33204,48.7561 2.60918,48.32307 3.25319,47.93083 3.60271,47.84973 3.99561,47.51261 4.2928,47.44534 4.87023,47.03069 4.81928,46.77428 4.91973,46.53031 4.71599,45.95124 4.8468,45.6851 4.80513,45.35403 4.89649,45.12537 4.70688,44.23812 4.78994,44.12708 4.7424,43.96645 4.8055,43.94902',
  },
  'avignon>barcelona': {
    distanceMeters: 431_668,
    durationSeconds: 16_982,
    path: '4.8055,43.94902 4.65474,43.95629 4.59656,43.9402 4.56208,43.90816 4.44567,43.87318 4.40839,43.83608 4.3112,43.80046 4.25298,43.75028 4.20908,43.74954 4.18582,43.72809 4.01445,43.67182 3.9398,43.60282 3.79856,43.54875 3.71295,43.48904 3.20428,43.29848 3.14184,43.23766 2.99042,43.16028 2.93586,43.07908 2.99251,42.88413 2.91084,42.83965 2.86258,42.69638 2.84932,42.54784 2.81859,42.51548 2.8639,42.47027 2.89129,42.3667 2.94554,42.31173 2.91217,42.10954 2.88106,42.05574 2.8418,42.04172 2.78046,41.98108 2.78831,41.93865 2.73623,41.76924 2.53716,41.71144 2.24028,41.55558 2.17743,41.46949 2.21475,41.42619 2.17486,41.38562',
  },
};

const parsePath = (value: string): Array<[number, number]> =>
  value.split(' ').map((pair) => {
    const [lon, lat] = pair.split(',');
    return [Number(lon), Number(lat)];
  });

const routeLabel = (place: Place.Place): string => normalize(place.name ?? place.city ?? place.code ?? '');

/**
 * Deterministic synchronous route computation: geocodes known city names from a fixed table
 * (already-resolved Places pass through unchanged). Uses captured OSRM geometry from
 * {@link ROUTE_FIXTURES} when available; otherwise produces a straight two-point leg with a
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

    const fixture = ROUTE_FIXTURES[`${routeLabel(origin)}>${routeLabel(destination)}`];
    if (fixture) {
      legs.push({
        origin,
        destination,
        distanceMeters: fixture.distanceMeters,
        durationSeconds: fixture.durationSeconds,
        path: parsePath(fixture.path),
      });
      continue;
    }

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
