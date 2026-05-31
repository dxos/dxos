//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Filter, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { Booking, Segment, Trip } from '../types';
import mergeTripHandler from './merge-trip';

describe('MergeTrip', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Trip.Trip, Segment.Segment, Booking.Booking] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addTrip = (props: Partial<Trip.Trip>, segments: Segment.Segment[]): Trip.Trip => {
    const trip = db.add(Trip.make(props));
    for (const segment of segments) {
      db.add(segment);
      Trip.addSegment(trip, segment);
    }
    return trip;
  };

  const merge = (trip: Trip.Trip) =>
    mergeTripHandler.handler({ trip }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

  test('merges a trip into the nearest trip within the gap and deletes it', async ({ expect }) => {
    const segA = Segment.make({ details: { _tag: 'flight', number: 'AA-1', departAt: '2026-06-01T10:00:00.000Z' } });
    const tripA = addTrip({ name: 'A', start: '2026-06-01T10:00:00.000Z', end: '2026-06-01T13:00:00.000Z' }, [segA]);
    // 4 days later — well within the default 28-day gap.
    const segB = Segment.make({ details: { _tag: 'train', number: 'TT-2', departAt: '2026-06-05T10:00:00.000Z' } });
    const tripB = addTrip({ name: 'B', start: '2026-06-05T10:00:00.000Z', end: '2026-06-05T12:00:00.000Z' }, [segB]);
    await db.flush();

    const result = await merge(tripB);
    expect(result.merged).toBe(true);
    expect(result.targetTripId).toBe(tripA.id);

    await db.flush();
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe(tripA.id);
    expect(trips[0].segments).toHaveLength(2);
    // Range widened to cover the merged trip.
    expect(trips[0].end).toBe('2026-06-05T12:00:00.000Z');
  });

  test('is a no-op when no other trip lies within the gap', async ({ expect }) => {
    const segA = Segment.make({ details: { _tag: 'flight', number: 'AA-1', departAt: '2026-06-01T10:00:00.000Z' } });
    addTrip({ name: 'A', start: '2026-06-01T10:00:00.000Z', end: '2026-06-01T13:00:00.000Z' }, [segA]);
    // ~6 months later — far beyond the gap.
    const segB = Segment.make({ details: { _tag: 'flight', number: 'BB-1', departAt: '2026-12-01T10:00:00.000Z' } });
    const tripB = addTrip({ name: 'B', start: '2026-12-01T10:00:00.000Z', end: '2026-12-01T12:00:00.000Z' }, [segB]);
    await db.flush();

    const result = await merge(tripB);
    expect(result.merged).toBe(false);

    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(2);
  });

  test('merges into the CLOSEST eligible trip and re-parents bookings', async ({ expect }) => {
    // Source (with a Booking) at day 10; two candidates within the gap at +2 and +8 days.
    const srcSeg = Segment.make({ details: { _tag: 'flight', number: 'SS-1', departAt: '2026-06-10T10:00:00.000Z' } });
    const source = addTrip({ name: 'Source', start: '2026-06-10T10:00:00.000Z', end: '2026-06-10T13:00:00.000Z' }, [
      srcSeg,
    ]);
    const booking = db.add(Booking.make({ confirmationCode: 'SRC1', source: 'email' }));
    Obj.setParent(booking, source);

    const nearSeg = Segment.make({ details: { _tag: 'flight', number: 'NN-1', departAt: '2026-06-12T10:00:00.000Z' } });
    const near = addTrip({ name: 'Near', start: '2026-06-12T10:00:00.000Z', end: '2026-06-12T12:00:00.000Z' }, [
      nearSeg,
    ]);
    const farSeg = Segment.make({ details: { _tag: 'flight', number: 'FF-1', departAt: '2026-06-18T10:00:00.000Z' } });
    addTrip({ name: 'Far', start: '2026-06-18T10:00:00.000Z', end: '2026-06-18T12:00:00.000Z' }, [farSeg]);
    await db.flush();

    const result = await merge(source);
    expect(result.merged).toBe(true);
    // The nearer of the two eligible trips wins.
    expect(result.targetTripId).toBe(near.id);

    await db.flush();
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(2);
    // The Booking moved with the merge (re-parented to the target trip).
    expect(Obj.getParent(booking)?.id).toBe(near.id);
  });
});
