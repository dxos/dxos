//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { type Place, type Routing, RoutingOperation, Segment, TripCapabilities, Trip } from '../types';

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
        return yield* Effect.fail(new Error('No routing service configured.'));
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
        const origin = Segment.getOrigin(segment);
        const destination = Segment.getDestination(segment);
        const waypoints = [toWaypoint(origin), toWaypoint(destination)].filter(
          (waypoint): waypoint is Routing.Waypoint => waypoint != null,
        );
        if (waypoints.length < 2) {
          continue;
        }

        // `tryPromise` routes a rejection (GeocodeError / RouteError / MissingApiKeyError) to the
        // operation's failure channel, preserving the original Error for the UI.
        const result = yield* Effect.tryPromise({
          try: () => service.route({ waypoints, profile: 'driving' }),
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        });
        const leg = result.legs[0];
        if (!leg) {
          continue;
        }

        writeLeg(segment, leg);
        distanceMeters += leg.distanceMeters;
        durationSeconds += leg.durationSeconds;
        legs++;
      }

      return { legs, distanceMeters, durationSeconds };
    }),
  ),
);

/** Routing input for a stop: the resolved Place when it has coordinates, otherwise its name to geocode. */
const toWaypoint = (place: Place.Place | undefined): Routing.Waypoint | undefined => {
  if (!place) {
    return undefined;
  }
  if (place.geo) {
    return place;
  }
  return place.name ?? place.city ?? place.code;
};

/** Writes a computed leg back onto a road segment: fills endpoint geo + distance/duration/path. */
const writeLeg = (segment: Segment.Segment, leg: Routing.RouteLeg): void =>
  Obj.update(segment, (segment) => {
    if (segment.details._tag !== 'road') {
      return;
    }
    if (segment.details.origin && leg.origin.geo) {
      Object.assign(segment.details.origin, { geo: leg.origin.geo });
    }
    if (segment.details.destination && leg.destination.geo) {
      Object.assign(segment.details.destination, { geo: leg.destination.geo });
    }
    segment.details.distanceMeters = leg.distanceMeters;
    segment.details.durationSeconds = leg.durationSeconds;
    // Copy to plain [lon, lat] arrays (the live segment's GeoPoint field is mutable number[][]).
    segment.details.path = leg.path.map((point) => [point[0], point[1]]);
  });
