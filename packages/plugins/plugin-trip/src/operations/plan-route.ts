//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';

import { type Routing, RoutingOperation, Segment, TripCapabilities, Trip } from '../types';

const EMPTY = { legs: 0, distanceMeters: 0, durationSeconds: 0 } as const;

export default RoutingOperation.PlanRoute.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ trip, waypoints, provider }) {
      if (!Trip.instanceOf(trip)) {
        return EMPTY;
      }

      const services = yield* Capability.getAll(TripCapabilities.RoutingService);
      const service = provider ? services.find((candidate) => candidate.id === provider) : services[0];
      if (!service) {
        return yield* Effect.fail(new Error('No routing service configured.'));
      }
      if (waypoints.length < 2) {
        // Not enough stops to form a leg — clear any previously-planned run and stop.
        reconcile(trip, []);
        return EMPTY;
      }

      // `tryPromise` routes a `route` rejection (GeocodeError / RouteError / MissingApiKeyError) to
      // the operation's failure channel; the `catch` preserves the original Error so the UI can
      // surface its message.
      const result = yield* Effect.tryPromise({
        try: () => service.route({ waypoints: [...waypoints], profile: 'driving' }),
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      });

      const segments = result.legs.map((leg) => makeRoadSegment(leg));
      reconcile(trip, segments);

      return {
        legs: result.legs.length,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
      };
    }),
  ),
);

/** Builds a planner-owned road `Segment` from a route leg. */
const makeRoadSegment = (leg: Routing.RouteLeg): Segment.Segment =>
  Segment.make({
    details: {
      _tag: 'road',
      subKind: 'car',
      origin: leg.origin,
      destination: leg.destination,
      distanceMeters: leg.distanceMeters,
      durationSeconds: leg.durationSeconds,
      path: [...leg.path],
      planned: true,
    },
  });

/**
 * Replaces the trip's contiguous run of planner-owned road segments with `next`, inserting the new
 * run where the old one started (or appending when none existed). Non-road segments and hand-added
 * road segments (`planned !== true`) are left untouched. New segments are added to the trip's
 * database and re-parented to the trip; removed segments are deleted.
 */
const reconcile = (trip: Trip.Trip, next: Segment.Segment[]): void => {
  const db = Obj.getDatabase(trip);
  const refs = trip.segments ?? [];

  const plannedIndices: number[] = [];
  refs.forEach((ref, index) => {
    const segment = Ref.isRef(ref) ? ref.target : undefined;
    if (Segment.instanceOf(segment) && Segment.isPlannedRoad(segment)) {
      plannedIndices.push(index);
    }
  });

  const insertAt = plannedIndices.length > 0 ? plannedIndices[0] : refs.length;
  const removed = plannedIndices
    .map((index) => (Ref.isRef(refs[index]) ? refs[index].target : undefined))
    .filter((segment): segment is Segment.Segment => Segment.instanceOf(segment));

  // Persist + parent the new segments before referencing them.
  const added = next.map((segment) => (db ? db.add(segment) : segment));
  for (const segment of added) {
    Obj.setParent(segment, trip);
  }

  Obj.update(trip, (trip) => {
    // Remove old planned refs (descending so earlier indices stay valid).
    for (let index = plannedIndices.length - 1; index >= 0; index--) {
      trip.segments.splice(plannedIndices[index], 1);
    }
    const at = Math.min(insertAt, trip.segments.length);
    trip.segments.splice(at, 0, ...added.map((segment) => Ref.make(segment)));
  });

  if (db) {
    for (const segment of removed) {
      db.remove(segment);
    }
  }
};
