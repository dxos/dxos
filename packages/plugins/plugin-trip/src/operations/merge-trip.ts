//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';

import { Booking, Segment, Trip, TripOperation } from '../types';
import { getTripGapDays } from './extractor/config';

export default TripOperation.MergeTrip.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ trip }) {
      if (!Trip.instanceOf(trip)) {
        return { merged: false };
      }
      const db = Obj.getDatabase(trip);
      if (!db) {
        return { merged: false };
      }

      const trips = yield* Effect.promise(() => db.query(Filter.type(Trip.Trip)).run());
      const target = nearestTrip(trip, trips, getTripGapDays());
      if (!target) {
        return { merged: false };
      }

      // Move each segment onto the target — `addSegment` re-parents (`Obj.setParent`) and appends.
      for (const ref of trip.segments ?? []) {
        const segment = Ref.isRef(ref) ? ref.target : undefined;
        if (Segment.instanceOf(segment)) {
          Trip.addSegment(target, segment);
        }
      }

      // Re-parent this trip's Bookings onto the target so they travel with their segments.
      const bookings = yield* Effect.promise(() => db.query(Filter.type(Booking.Booking)).run());
      for (const booking of bookings) {
        if (Obj.getParent(booking)?.id === trip.id) {
          Obj.setParent(booking, target);
        }
      }

      // Widen the target's range to cover the merged trip.
      Obj.update(target, (target) => {
        if (trip.start && (!target.start || trip.start < target.start)) {
          target.start = trip.start;
        }
        if (trip.end && (!target.end || trip.end > target.end)) {
          target.end = trip.end;
        }
      });

      // Detach the now-moved segments from the source and delete it.
      Obj.update(trip, (trip) => {
        if (trip.segments) {
          trip.segments.splice(0, trip.segments.length);
        }
      });
      db.remove(trip);

      return { merged: true, targetTripId: target.id };
    }),
  ),
);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse an ISO timestamp to epoch millis; undefined if missing or invalid. */
const epoch = (iso?: string): number | undefined => {
  if (!iso) {
    return undefined;
  }
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? undefined : ms;
};

/** Gap in days between two trips' date ranges (0 when they overlap); undefined if either is undated. */
const rangeGapDays = (a: Trip.Trip, b: Trip.Trip): number | undefined => {
  const aStart = epoch(a.start);
  const bStart = epoch(b.start);
  if (aStart === undefined || bStart === undefined) {
    return undefined;
  }
  const aEnd = epoch(a.end) ?? aStart;
  const bEnd = epoch(b.end) ?? bStart;
  return Math.max(0, aStart - bEnd, bStart - aEnd) / MS_PER_DAY;
};

/** Nearest other Trip whose date range lies within `gapDays` of `source`. */
const nearestTrip = (source: Trip.Trip, trips: readonly Trip.Trip[], gapDays: number): Trip.Trip | undefined => {
  let best: Trip.Trip | undefined;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const candidate of trips) {
    if (candidate.id === source.id) {
      continue;
    }
    const gap = rangeGapDays(source, candidate);
    if (gap === undefined || gap > gapDays) {
      continue;
    }
    if (gap < bestGap) {
      bestGap = gap;
      best = candidate;
    }
  }
  return best;
};
