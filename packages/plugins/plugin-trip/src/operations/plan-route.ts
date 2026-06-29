//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { type Place, Routing, RoutingOperation, Segment, Trip, TripCapabilities } from '#types';

const EMPTY = { legs: 0, distanceMeters: 0, durationSeconds: 0 } as const;

export default RoutingOperation.PlanRoute.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ trip, provider }) {
      if (!Trip.instanceOf(trip)) {
        return EMPTY;
      }

      const services = yield* Capability.getAll(TripCapabilities.RoutingService);
      const service = provider ? services.find((candidate) => candidate.id === provider) : services[0];
      if (!service) {
        return yield* Effect.fail(new Routing.RouteError('No routing service configured.'));
      }

      // Road segments with both endpoints, in itinerary order. Each is routed independently so the
      // segments need not form a contiguous chain.
      const roads = Trip.getSegments(trip).filter(
        (segment) =>
          segment.details._tag === 'road' && !!Segment.getOrigin(segment) && !!Segment.getDestination(segment),
      );

      let distanceMeters = 0;
      let durationSeconds = 0;
      let legs = 0;
      for (const segment of roads) {
        const waypoints = [toWaypoint(Segment.getOrigin(segment)), toWaypoint(Segment.getDestination(segment))].filter(
          (waypoint): waypoint is Routing.Waypoint => waypoint != null,
        );
        log.info('request', { provider: service.id, waypoints: waypoints.length });
        if (waypoints.length < 2) {
          continue;
        }

        // `tryPromise` routes a rejection (GeocodeError / RouteError / MissingApiKeyError)
        // to the operation's failure channel, preserving the original Error for the UI.
        const result = yield* Effect.tryPromise({
          try: () => service.route({ waypoints, profile: 'driving' }),
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        });

        const route = result.routes[0];
        log.info('response', { provider: service.id, routes: result.routes.length });
        if (!route) {
          continue;
        }

        writeRoute(segment, result.waypoints, result.routes);
        distanceMeters += route.distance;
        durationSeconds += route.duration;
        legs++;
      }

      return { legs, distanceMeters, durationSeconds };
    }),
  ),
);

/** Routing input for a stop: the resolved Place when it has coordinates, otherwise a string to geocode. */
const toWaypoint = (place: Place.Place | undefined): Routing.Waypoint | undefined => {
  if (!place) {
    return undefined;
  }
  if (place.geo) {
    return place;
  }
  // Geocoding query: prefer an unambiguous code, then "City, Country", then the free-form name.
  if (place.code) {
    return place.code;
  }
  if (place.city) {
    return [place.city, place.country].filter(Boolean).join(', ');
  }

  return place.name;
};

/** Writes the computed route(s) onto a road segment and fills endpoint geo from the geocoded stops. */
const writeRoute = (
  segment: Segment.Segment,
  waypoints: readonly Place.Place[],
  routes: readonly Routing.Route[],
): void =>
  Obj.update(segment, (segment) => {
    if (segment.details._tag !== 'road') {
      return;
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    if (segment.details.origin && origin?.geo) {
      Object.assign(segment.details.origin, { geo: [origin.geo[0], origin.geo[1]] });
    }
    if (segment.details.destination && destination?.geo) {
      Object.assign(segment.details.destination, { geo: [destination.geo[0], destination.geo[1]] });
    }

    // Deep-copy to plain mutable arrays (the live segment's GeoPoint fields are mutable number[][]).
    segment.details.routes = routes.map(cloneRoute);
  });

// Return type is inferred (plain mutable arrays) so it assigns to the live segment's GeoPoint fields.
// Distance (meters) and duration (seconds) are floored to whole units; sub-unit precision is noise.
const cloneRoute = (route: Routing.Route) => ({
  distance: Math.floor(route.distance),
  duration: Math.floor(route.duration),
  legs: route.legs.map((leg) => ({
    distance: Math.floor(leg.distance),
    duration: Math.floor(leg.duration),
    summary: leg.summary,
    geometry: leg.geometry.map((point) => [point[0], point[1]]),
    steps: leg.steps.map((step) => ({ name: step.name, ref: step.ref })),
  })),
});
