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
import { Organization } from '@dxos/types';

import { Booking, Segment, Trip } from '../../types';
import gateChangeRaw from './testing/files/gate-change.md?raw';
import genericConfirmationRaw from './testing/files/generic-booking-confirmation.md?raw';
import unitedConfirmationRaw from './testing/files/united-confirmation.md?raw';
import unrelatedRaw from './testing/files/unrelated.md?raw';
import { parseFixtureMessage } from './testing/load-fixture';
import { ID, TripMessageExtractor } from './trip-extractor';

// Empty resolver — the trip extractor dedupes/groups via direct db queries, not the Resolver.
const noResolver = fromResolvers({});

// Mock LLM payloads. The fixture body is handed to a mocked `generateObject`, so the fixture text
// only drives `match()`; the structured payload below is what assembly consumes.
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

// No `provider` field — exercises the sender-domain + airline-prefix derivation in the extractor.
const AIR_FRANCE_PAYLOAD = {
  number: 'AF-7',
  origin: { code: 'CDG', name: 'Paris' },
  destination: { code: 'JFK', name: 'New York' },
  departAt: '2026-07-01T10:00:00.000Z',
  arriveAt: '2026-07-01T13:00:00.000Z',
  confirmationCode: 'AF999',
};

// A second leg under the same PNR (ABC123) as UNITED_PAYLOAD, departing later.
const SECOND_LEG_PAYLOAD = {
  number: 'AF-9',
  origin: { code: 'JFK', name: 'New York' },
  destination: { code: 'LAX', name: 'Los Angeles' },
  departAt: '2026-06-10T12:00:00.000Z',
  arriveAt: '2026-06-10T15:00:00.000Z',
  confirmationCode: 'ABC123',
};

describe('TripMessageExtractor', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [Booking.Booking, Segment.Segment, Trip.Trip, Organization.Organization],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const extract = (raw: string, payload: unknown) =>
    TripMessageExtractor.extract({ db, source: parseFixtureMessage(raw) })
      .pipe(Effect.provide(Layer.mergeAll(mockAiService({ object: payload }), noResolver)))
      .pipe(runAndForwardErrors);

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
    const result = await extract(genericConfirmationRaw, {});
    expect(result.created).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  test('extract — first email creates Trip + Booking + flight Segment', async ({ expect }) => {
    const result = await extract(unitedConfirmationRaw, UNITED_PAYLOAD);

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
    expect(segment.details.destination?.code).toBe('LHR');
    expect(segment.details.departAt).toBe('2026-06-01T15:30:00.000Z');
    expect(segment.details.arriveAt).toBe('2026-06-02T09:30:00.000Z');
    // The Segment references the Booking created from the same email.
    expect(segment.booking?.target?.id).toBe(booking.id);

    expect(result.relations).toEqual([]);
  });

  test('extract — subsequent email updates the existing segment instead of creating a duplicate', async ({
    expect,
  }) => {
    // Email 1: original confirmation. Persist the resulting objects so the second extract() call
    // can find the segment via the (number, departAt-date) key.
    const first = await extract(unitedConfirmationRaw, UNITED_PAYLOAD);
    expect(first.created).toHaveLength(3);
    const firstSegment = first.created.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;
    for (const obj of first.created) {
      db.add(obj);
    }
    await db.flush();

    // Email 2: gate change for the same flight. Same number + departAt-date as email 1.
    const second = await extract(gateChangeRaw, GATE_CHANGE_PAYLOAD);

    expect(second.created).toEqual([]);
    // The updated segment plus its owning Trip (so the source message links to the Trip).
    expect(second.updated).toHaveLength(2);

    const updatedSegment = second.updated!.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;
    expect(updatedSegment.id).toBe(firstSegment.id);
    if (updatedSegment.details._tag !== 'flight') {
      throw new Error('expected flight details');
    }
    expect(updatedSegment.details.gateFrom).toBe('21B');
    expect(updatedSegment.details.terminalFrom).toBe('3');
    expect(updatedSegment.details.number).toBe('AF-1');

    // Still only one Booking + one Segment in the database after two emails.
    await db.flush();
    const bookings = await db.query(Filter.type(Booking.Booking)).run();
    const segments = await db.query(Filter.type(Segment.Segment)).run();
    expect(bookings).toHaveLength(1);
    expect(segments).toHaveLength(1);
  });

  test('extract — provider domain comes from the sender, name from the airline prefix', async ({ expect }) => {
    // The payload omits `provider`, so the extractor derives it: domain from the sender
    // (airfrance.com), name from the AF flight-number prefix.
    const result = await extract(AIR_FRANCE_RAW, AIR_FRANCE_PAYLOAD);

    const booking = result.created.find((obj) => Obj.instanceOf(Booking.Booking, obj)) as Booking.Booking;
    expect(booking.provider?.domain).toBe('airfrance.com');
    expect(booking.provider?.name).toBe('Air France');

    const segment = result.created.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;
    if (segment.details._tag !== 'flight') {
      throw new Error('expected flight details');
    }
    expect(segment.details.provider?.domain).toBe('airfrance.com');
    expect(segment.booking?.target?.id).toBe(booking.id);
  });

  test('extract — links the provider to a matching Organization', async ({ expect }) => {
    const org = db.add(Organization.make({ name: 'Air France', website: 'https://airfrance.com' }));
    await db.flush();

    const result = await extract(AIR_FRANCE_RAW, AIR_FRANCE_PAYLOAD);

    const booking = result.created.find((obj) => Obj.instanceOf(Booking.Booking, obj)) as Booking.Booking;
    expect(booking.provider?.ref?.target?.id).toBe(org.id);
  });

  test('extract — a second leg under the same PNR is appended to the existing Trip', async ({ expect }) => {
    // Email 1 creates a Trip; persist it so the second extract can discover the shared Booking.
    const first = await extract(unitedConfirmationRaw, UNITED_PAYLOAD);
    for (const obj of first.created) {
      db.add(obj);
    }
    await db.flush();
    const trip = first.created.find((obj) => Obj.instanceOf(Trip.Trip, obj)) as Trip.Trip;

    // Email 2: a different flight under the SAME confirmation code (ABC123) → appended to the
    // existing Trip, not a new one.
    const second = await extract(unitedConfirmationRaw, SECOND_LEG_PAYLOAD);
    expect(second.created.some((obj) => Obj.instanceOf(Trip.Trip, obj))).toBe(false);
    expect(second.created).toHaveLength(1);
    expect(second.updated).toHaveLength(1);
    expect((second.updated![0] as Trip.Trip).id).toBe(trip.id);

    for (const obj of second.created) {
      db.add(obj);
    }
    await db.flush();
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(1);
    expect(trips[0].segments).toHaveLength(2);
    // The Trip date range widens to cover the appended leg (depart 2026-06-01, arrive 2026-06-10).
    expect(trips[0].start).toBe('2026-06-01T15:30:00.000Z');
    expect(trips[0].end).toBe('2026-06-10T15:00:00.000Z');
  });
});

const AIR_FRANCE_RAW = [
  'From: noreply@airfrance.com',
  'Subject: Flight confirmation',
  '',
  'Air France booking confirmation.',
].join('\n');
