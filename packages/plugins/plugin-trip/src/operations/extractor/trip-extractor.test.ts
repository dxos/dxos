//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { Booking, Segment } from '../../types';
import gateChangeRaw from './testing/files/gate-change.txt?raw';
import genericConfirmationRaw from './testing/files/generic-booking-confirmation.txt?raw';
import unitedConfirmationRaw from './testing/files/united-confirmation.txt?raw';
import unrelatedRaw from './testing/files/unrelated.txt?raw';
import { parseFixtureMessage } from './testing/load-fixture';
import { ID, TripMessageExtractor } from './trip-extractor';

describe('TripMessageExtractor', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({ types: [Booking.Booking, Segment.Segment] });
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
    }).pipe(runAndForwardErrors);

    expect(result.created).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  test('extract — first email creates Booking + flight Segment', async ({ expect }) => {
    const message = parseFixtureMessage(unitedConfirmationRaw);
    const result = await TripMessageExtractor.extract({ db, message }).pipe(runAndForwardErrors);

    expect(result.created).toHaveLength(2);
    expect(result.updated).toEqual([]);

    const booking = result.created.find((obj) => Obj.instanceOf(Booking.Booking, obj)) as Booking.Booking;
    const segment = result.created.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;

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
    }).pipe(runAndForwardErrors);
    expect(first.created).toHaveLength(2);
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
    }).pipe(runAndForwardErrors);

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
});
