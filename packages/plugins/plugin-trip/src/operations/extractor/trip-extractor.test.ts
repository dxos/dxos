//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { fromResolvers } from '@dxos/extractor';
import { mockAiService } from '@dxos/extractor/testing';

import { Booking, Segment, Trip } from '../../types';
import gateChangeRaw from './testing/files/gate-change.md?raw';
import genericConfirmationRaw from './testing/files/generic-booking-confirmation.md?raw';
import unitedConfirmationRaw from './testing/files/united-confirmation.md?raw';
import unrelatedRaw from './testing/files/unrelated.md?raw';
import { parseFixtureMessage } from './testing/load-fixture';
import { ID, TripMessageExtractor } from './trip-extractor';

// Empty resolver — the trip extractor dedupes segments via a direct db query, not the Resolver.
const noResolver = fromResolvers({});

// Mock LLM payloads. The body is handed to a mocked `generateObject`, so the fixture text only
// drives `match()`; the structured payload below is what assembly consumes.
const UNITED_PAYLOAD = {
  number: 'AF-1',
  origin: { code: 'SFO', name: 'San Francisco' },
  destination: { code: 'LHR', name: 'London Heathrow' },
  departAt: '2026-06-01T15:30:00.000Z',
  arriveAt: '2026-06-02T09:30:00.000Z',
  confirmationCode: 'ABC123',
  provider: { name: 'Air France', domain: 'united.com' },
};

const GATE_CHANGE_PAYLOAD = {
  number: 'AF-1',
  origin: { code: 'SFO', name: 'San Francisco' },
  destination: { code: 'LHR', name: 'London Heathrow' },
  departAt: '2026-06-01T15:30:00.000Z',
  arriveAt: '2026-06-02T09:30:00.000Z',
  gateFrom: '21B',
  terminalFrom: '3',
};

describe('TripMessageExtractor', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Booking.Booking, Segment.Segment, Trip.Trip] }));
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

  test('extract — no flight identity emits no objects', async ({ expect }) => {
    const result = await TripMessageExtractor.extract({ db, source: parseFixtureMessage(genericConfirmationRaw) })
      .pipe(Effect.provide(Layer.mergeAll(mockAiService({ object: {} }), noResolver)))
      .pipe(runAndForwardErrors);

    expect(result.created).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  test('extract — first email creates Trip + Booking + flight Segment', async ({ expect }) => {
    const result = await TripMessageExtractor.extract({ db, source: parseFixtureMessage(unitedConfirmationRaw) })
      .pipe(Effect.provide(Layer.mergeAll(mockAiService({ object: UNITED_PAYLOAD }), noResolver)))
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
    // Email 1: original confirmation. Persist the resulting objects so the second extract() call
    // can find the segment via the (number, departAt-date) key.
    const first = await TripMessageExtractor.extract({ db, source: parseFixtureMessage(unitedConfirmationRaw) })
      .pipe(Effect.provide(Layer.mergeAll(mockAiService({ object: UNITED_PAYLOAD }), noResolver)))
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
    const second = await TripMessageExtractor.extract({ db, source: parseFixtureMessage(gateChangeRaw) })
      .pipe(Effect.provide(Layer.mergeAll(mockAiService({ object: GATE_CHANGE_PAYLOAD }), noResolver)))
      .pipe(runAndForwardErrors);

    expect(second.created).toEqual([]);
    // The updated segment plus its owning Trip (so the source message links to the Trip).
    expect(second.updated).toHaveLength(2);

    const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;
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
