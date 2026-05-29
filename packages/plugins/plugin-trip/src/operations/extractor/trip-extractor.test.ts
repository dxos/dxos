//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { Filter, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Organization } from '@dxos/types';

import { Booking, Segment, Trip } from '../../types';
import gateChangeRaw from './testing/files/gate-change.txt?raw';
import genericConfirmationRaw from './testing/files/generic-booking-confirmation.txt?raw';
import unitedConfirmationRaw from './testing/files/united-confirmation.txt?raw';
import unrelatedRaw from './testing/files/unrelated.txt?raw';
import { parseFixtureMessage } from './testing/load-fixture';
import { ID, TripMessageExtractor } from './trip-extractor';

// `MessageExtractor.extract` is typed with `R = Operation.Service` to accommodate AI-backed
// extractors that delegate via `Operation.invoke` (e.g. the summarize extractor in
// plugin-inbox). The trip extractor never actually yields `Operation.Service` — its
// implementation returns `R = never` — but every caller going through the interface inherits
// the wider `R`. The stub satisfies the type so `runAndForwardErrors` (which requires
// `R = never`) is callable; the stub's methods are unreachable for the trip path.
const provideOperationServiceStub = Effect.provideService(Operation.Service, {
  invoke: () => Effect.die('Operation.Service stub: invoke not available in trip extractor tests.'),
  schedule: () => Effect.die('Operation.Service stub: schedule not available in trip extractor tests.'),
  invokePromise: async () => ({ error: new Error('Operation.Service stub: invokePromise not available.') }),
} as any);

describe('TripMessageExtractor', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({
      types: [Booking.Booking, Segment.Segment, Trip.Trip, Organization.Organization],
    });
    db = result.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  test('id and kinds', ({ expect }) => {
    expect(TripMessageExtractor.id).toBe(ID);
    expect(TripMessageExtractor.kinds).toContain('flight');
  });

  test('match — United sender domain', ({ expect }) => {
    const result = TripMessageExtractor.match(parseFixtureMessage(unitedConfirmationRaw));
    expect(result.matched).toBe(true);
    expect(result.confidence ?? 0).toBeGreaterThan(0.5);
  });

  test('match — subject-only fallback', ({ expect }) => {
    const result = TripMessageExtractor.match(parseFixtureMessage(genericConfirmationRaw));
    expect(result.matched).toBe(true);
  });

  test('match — unrelated message rejected', ({ expect }) => {
    const result = TripMessageExtractor.match(parseFixtureMessage(unrelatedRaw));
    expect(result.matched).toBe(false);
  });

  test('extract — subject-only generic confirmation emits no objects', async ({ expect }) => {
    // Match succeeds on the "booking confirmation" subject keyword, but the body lacks any
    // flight identity. Without a number + departAt the extractor should not invent a Booking.
    const result = await TripMessageExtractor.extract({
      db,
      message: parseFixtureMessage(genericConfirmationRaw),
    })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);

    expect(result.created).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  test('extract — first email creates Trip + Booking + flight Segment', async ({ expect }) => {
    const message = parseFixtureMessage(unitedConfirmationRaw);
    const result = await TripMessageExtractor.extract({ db, message })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);

    expect(result.created).toHaveLength(3);
    expect(result.updated).toEqual([]);

    const trip = result.created.find((obj) => Obj.instanceOf(Trip.Trip, obj)) as Trip.Trip;
    const booking = result.created.find((obj) => Obj.instanceOf(Booking.Booking, obj)) as Booking.Booking;
    const segment = result.created.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;

    expect(trip.name).toContain('SFO');
    expect(trip.name).toContain('LHR');
    expect(trip.segments).toHaveLength(1);

    expect(booking.confirmationCode).toBe('ABC123');
    expect(booking.source).toBe('email');
    expect(booking.provider?.domain).toBe('united.com');

    expect(segment.details._tag).toBe('flight');
    if (segment.details._tag !== 'flight') {
      throw new Error('expected flight details');
    }
    expect(segment.details.number).toBe('AF-1');
    expect(segment.details.origin?.code).toBe('SFO');
    expect(segment.details.origin?.name).toBe('San Francisco');
    expect(segment.details.destination?.code).toBe('LHR');
    expect(segment.details.destination?.name).toBe('London Heathrow');
    expect(segment.details.departAt).toBe('2026-06-01T15:30:00.000Z');
    expect(segment.details.arriveAt).toBe('2026-06-02T09:30:00.000Z');

    expect(result.relations).toEqual([]);
  });

  test('extract — subsequent email updates the existing segment instead of creating a duplicate', async ({
    expect,
  }) => {
    // Email 1: original confirmation. Persist the resulting segment into the db so the
    // second extract() call can find it via the (number, departAt-date) key.
    const first = await TripMessageExtractor.extract({
      db,
      message: parseFixtureMessage(unitedConfirmationRaw),
    })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);
    expect(first.created).toHaveLength(3);
    const firstSegment = first.created.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;
    for (const obj of first.created) {
      db.add(obj);
    }
    await db.flush();

    expect(firstSegment.details._tag).toBe('flight');
    if (firstSegment.details._tag !== 'flight') {
      throw new Error('expected flight details');
    }
    expect(firstSegment.details.gateFrom).toBeUndefined();
    expect(firstSegment.details.terminalFrom).toBeUndefined();

    // Email 2: gate change for the same flight. Same number + departAt-date as email 1.
    const second = await TripMessageExtractor.extract({
      db,
      message: parseFixtureMessage(gateChangeRaw),
    })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);

    expect(second.created).toEqual([]);
    expect(second.updated).toHaveLength(1);

    const updatedSegment = second.updated![0] as Segment.Segment;
    expect(updatedSegment.id).toBe(firstSegment.id);
    expect(updatedSegment.details._tag).toBe('flight');
    if (updatedSegment.details._tag !== 'flight') {
      throw new Error('expected flight details');
    }
    expect(updatedSegment.details.gateFrom).toBe('21B');
    expect(updatedSegment.details.terminalFrom).toBe('3');
    // Pre-existing fields are preserved.
    expect(updatedSegment.details.number).toBe('AF-1');
    expect(updatedSegment.details.departAt).toBe('2026-06-01T15:30:00.000Z');
    expect(updatedSegment.details.arriveAt).toBe('2026-06-02T09:30:00.000Z');

    // Still only one Booking + one Segment in the database after two emails.
    await db.flush();
    const bookings = await db.query(Filter.type(Booking.Booking)).run();
    const segments = await db.query(Filter.type(Segment.Segment)).run();
    expect(bookings).toHaveLength(1);
    expect(segments).toHaveLength(1);
  });

  test('extract — provider domain comes from the sender, name from the airline prefix', async ({ expect }) => {
    // Regression: the provider was hardcoded to united.com regardless of the actual airline.
    const result = await TripMessageExtractor.extract({ db, message: parseFixtureMessage(AIR_FRANCE_RAW) })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);

    const booking = result.created.find((obj) => Obj.instanceOf(Booking.Booking, obj)) as Booking.Booking;
    expect(booking.provider?.domain).toBe('airfrance.com');
    expect(booking.provider?.name).toBe('Air France');

    const segment = result.created.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;
    if (segment.details._tag !== 'flight') {
      throw new Error('expected flight details');
    }
    expect(segment.details.provider?.domain).toBe('airfrance.com');
    // The Segment references the Booking created from the same email.
    expect(segment.booking?.target?.id).toBe(booking.id);
  });

  test('extract — links the provider to a matching Organization', async ({ expect }) => {
    const org = db.add(Organization.make({ name: 'Air France', website: 'https://airfrance.com' }));
    await db.flush();

    const result = await TripMessageExtractor.extract({ db, message: parseFixtureMessage(AIR_FRANCE_RAW) })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);

    const booking = result.created.find((obj) => Obj.instanceOf(Booking.Booking, obj)) as Booking.Booking;
    expect(booking.provider?.ref?.target?.id).toBe(org.id);
  });

  test('extract — a different flight is appended to the most-recently-created Trip', async ({ expect }) => {
    // Email 1 creates a Trip; persist it so the second extract can discover it.
    const first = await TripMessageExtractor.extract({ db, message: parseFixtureMessage(unitedConfirmationRaw) })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);
    for (const obj of first.created) {
      db.add(obj);
    }
    await db.flush();
    const trip = first.created.find((obj) => Obj.instanceOf(Trip.Trip, obj)) as Trip.Trip;

    // Email 2: a different flight (new number) → no segment match → append to the existing Trip.
    const second = await TripMessageExtractor.extract({ db, message: parseFixtureMessage(SECOND_FLIGHT_RAW) })
      .pipe(provideOperationServiceStub)
      .pipe(runAndForwardErrors);

    // No new Trip; the existing one is returned as `updated` so the dispatcher links the message.
    expect(second.created.some((obj) => Obj.instanceOf(Trip.Trip, obj))).toBe(false);
    expect(second.created).toHaveLength(2);
    expect(second.updated).toHaveLength(1);
    expect((second.updated![0] as Trip.Trip).id).toBe(trip.id);

    // After both emails there is a single Trip referencing two segments.
    for (const obj of second.created) {
      db.add(obj);
    }
    await db.flush();
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(1);
    expect(trips[0].segments).toHaveLength(2);
    // The Trip date range widens to cover the appended segment (depart 2026-06-10).
    expect(trips[0].start).toBe('2026-06-01T15:30:00.000Z');
    expect(trips[0].end).toBe('2026-06-10T15:00:00.000Z');
  });
});

const AIR_FRANCE_RAW = [
  'From: noreply@airfrance.com',
  'Subject: Flight confirmation',
  '',
  'Flight: AF-7',
  'From: CDG (Paris)',
  'To: JFK (New York)',
  'Depart: 2026-07-01 10:00',
  'Arrive: 2026-07-01 13:00',
  'Confirmation: AF999',
].join('\n');

const SECOND_FLIGHT_RAW = [
  'From: noreply@united.com',
  'Subject: Flight confirmation',
  '',
  'Flight: AF-2',
  'From: LHR (London Heathrow)',
  'To: SFO (San Francisco)',
  'Depart: 2026-06-10 12:00',
  'Arrive: 2026-06-10 15:00',
  'Confirmation: XYZ789',
].join('\n');
