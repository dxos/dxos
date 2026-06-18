//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { fromResolvers } from '@dxos/extractor';
import { mockAiService } from '@dxos/extractor/testing';
import { Organization } from '@dxos/types';

import { Booking, Segment, Trip } from '../../types';
import gateChangeRaw from './testing/files/gate-change.md?raw';
import genericConfirmationRaw from './testing/files/generic-booking-confirmation.md?raw';
import klmConfirmationRaw from './testing/files/klm-confirmation.md?raw';
import unitedConfirmationRaw from './testing/files/united-confirmation.md?raw';
import unrelatedRaw from './testing/files/unrelated.md?raw';
import { parseFixtureMessage } from './testing/load-fixture';
import { TEMPLATE_ID, TripMessageExtractor } from './trip-extractor';

// Empty resolver — the trip extractor dedupes/groups via direct db queries, not the Resolver.
const noResolver = fromResolvers({});

// Mock LLM payloads. The fixture body is handed to a mocked `generateObject`, so the fixture text
// only drives `match()`; the structured payload below is what assembly consumes.
const UNITED_PAYLOAD = {
  confirmationCode: 'ABC123',
  segments: [
    {
      number: 'AF-1',
      origin: { code: 'SFO', name: 'San Francisco' },
      destination: { code: 'LHR', name: 'London Heathrow' },
      departAt: '2026-06-01T15:30:00.000Z',
      arriveAt: '2026-06-02T09:30:00.000Z',
      provider: { name: 'Air France', domain: 'united.com' },
    },
  ],
};

const GATE_CHANGE_PAYLOAD = {
  segments: [
    {
      number: 'AF-1',
      origin: { code: 'SFO', name: 'San Francisco' },
      destination: { code: 'LHR', name: 'London Heathrow' },
      departAt: '2026-06-01T15:30:00.000Z',
      arriveAt: '2026-06-02T09:30:00.000Z',
      gateFrom: '21B',
      terminalFrom: '3',
    },
  ],
};

// No `provider` field — exercises the sender-domain + airline-prefix derivation in the extractor.
const AIR_FRANCE_PAYLOAD = {
  confirmationCode: 'AF999',
  segments: [
    {
      number: 'AF-7',
      origin: { code: 'CDG', name: 'Paris' },
      destination: { code: 'JFK', name: 'New York' },
      departAt: '2026-07-01T10:00:00.000Z',
      arriveAt: '2026-07-01T13:00:00.000Z',
    },
  ],
};

// A second leg under the same PNR (ABC123) as UNITED_PAYLOAD, departing later.
const SECOND_LEG_PAYLOAD = {
  confirmationCode: 'ABC123',
  segments: [
    {
      number: 'AF-9',
      origin: { code: 'JFK', name: 'New York' },
      destination: { code: 'LAX', name: 'Los Angeles' },
      departAt: '2026-06-10T12:00:00.000Z',
      arriveAt: '2026-06-10T15:00:00.000Z',
    },
  ],
};

// The SAME booking as UNITED_PAYLOAD, but a second email's LLM pass returns the PNR with
// different casing/whitespace ("abc 123" vs "ABC123"). Two related emails for one booking must
// still resolve to a single Trip — the confirmation-code dedup has to be representation-insensitive.
const SECOND_LEG_PNR_VARIANT_PAYLOAD = {
  confirmationCode: 'abc 123',
  segments: [
    {
      number: 'AF-9',
      origin: { code: 'JFK', name: 'New York' },
      destination: { code: 'LAX', name: 'Los Angeles' },
      departAt: '2026-06-10T12:00:00.000Z',
      arriveAt: '2026-06-10T15:00:00.000Z',
    },
  ],
};

// One email with TWO connecting flights under a single PNR (LIS→AMS→JFK).
const MULTI_LEG_PAYLOAD = {
  confirmationCode: 'XU26Y4',
  segments: [
    {
      number: 'KL1580',
      origin: { code: 'LIS', name: 'Lisbon' },
      destination: { code: 'AMS', name: 'Amsterdam' },
      departAt: '2026-05-18T11:55:00.000Z',
      arriveAt: '2026-05-18T15:50:00.000Z',
    },
    {
      number: 'KL0643',
      origin: { code: 'AMS', name: 'Amsterdam' },
      destination: { code: 'JFK', name: 'New York City' },
      departAt: '2026-05-18T17:15:00.000Z',
      arriveAt: '2026-05-18T19:15:00.000Z',
    },
  ],
};

// A separately-booked leg (different PNR) within the default 28-day gap of the United trip.
const NEARBY_LEG_PAYLOAD = {
  confirmationCode: 'GAP111',
  segments: [
    {
      number: 'AF-20',
      origin: { code: 'LHR', name: 'London' },
      destination: { code: 'CDG', name: 'Paris' },
      departAt: '2026-06-20T10:00:00.000Z',
      arriveAt: '2026-06-20T12:00:00.000Z',
    },
  ],
};

// A leg far outside the gap (~3 months later) → its own Trip.
const FAR_LEG_PAYLOAD = {
  confirmationCode: 'FAR222',
  segments: [
    {
      number: 'AF-30',
      origin: { code: 'CDG', name: 'Paris' },
      destination: { code: 'JFK', name: 'New York' },
      departAt: '2026-09-01T10:00:00.000Z',
      arriveAt: '2026-09-01T13:00:00.000Z',
    },
  ],
};

// A rail booking (Alfa Pendular) under its own PNR.
const TRAIN_PAYLOAD = {
  confirmationCode: 'TR333',
  segments: [
    {
      kind: 'train' as const,
      number: 'AP 182',
      origin: { code: 'FCR', name: 'Porto Campanhã' },
      destination: { code: 'ORC', name: 'Lisboa Oriente' },
      departAt: '2026-06-05T08:00:00.000Z',
      arriveAt: '2026-06-05T11:00:00.000Z',
      platform: '4',
      coach: '12',
      provider: { name: 'Alfa Pendular' },
    },
  ],
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
      .pipe(EffectEx.runAndForwardErrors);

  test('id and kinds', ({ expect }) => {
    expect(TripMessageExtractor.id).toBe(TEMPLATE_ID);
    expect(TripMessageExtractor.kinds).toContain('flight');
  });

  test('match — United sender domain', ({ expect }) => {
    const result = TripMessageExtractor.match(parseFixtureMessage(unitedConfirmationRaw));
    expect(result.matched).toBe(true);
    expect(result.confidence ?? 0).toBeGreaterThan(0.5);
  });

  test('match — KLM sender domain (no travel keyword in subject)', ({ expect }) => {
    const result = TripMessageExtractor.match(parseFixtureMessage(klmConfirmationRaw));
    expect(result.matched).toBe(true);
    expect(result.reason).toBe('sender-domain');
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

  test('extract — a multi-leg email creates one Trip + Booking with all segments', async ({ expect }) => {
    const result = await extract(unitedConfirmationRaw, MULTI_LEG_PAYLOAD);

    const trips = result.created.filter((obj) => Obj.instanceOf(Trip.Trip, obj));
    const bookings = result.created.filter((obj) => Obj.instanceOf(Booking.Booking, obj));
    const segments = result.created.filter((obj) => Obj.instanceOf(Segment.Segment, obj));
    expect(trips).toHaveLength(1);
    expect(bookings).toHaveLength(1);
    expect(segments).toHaveLength(2);
    expect((trips[0] as Trip.Trip).segments).toHaveLength(2);

    const numbers = segments
      .map((segment) => (segment as Segment.Segment).details)
      .map((details) => (details._tag === 'flight' ? details.number : undefined));
    expect(numbers).toContain('KL1580');
    expect(numbers).toContain('KL0643');

    // Both segments share the single Booking (one PNR).
    const bookingId = (bookings[0] as Booking.Booking).id;
    for (const segment of segments) {
      expect((segment as Segment.Segment).booking?.target?.id).toBe(bookingId);
    }
    // Trip range spans the first departure to the last arrival.
    expect((trips[0] as Trip.Trip).start).toBe('2026-05-18T11:55:00.000Z');
    expect((trips[0] as Trip.Trip).end).toBe('2026-05-18T19:15:00.000Z');
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

  test('extract — a second email whose PNR differs only in case/whitespace appends to the same Trip', async ({
    expect,
  }) => {
    // Email 1 creates a Trip under PNR "ABC123"; persist it.
    const first = await extract(unitedConfirmationRaw, UNITED_PAYLOAD);
    for (const obj of first.created) {
      db.add(obj);
    }
    await db.flush();
    const trip = first.created.find((obj) => Obj.instanceOf(Trip.Trip, obj)) as Trip.Trip;

    // Email 2: the SAME booking, but the LLM returned the PNR as "abc 123". This is one booking
    // across two emails — it must append to the existing Trip, not spawn a duplicate.
    const second = await extract(unitedConfirmationRaw, SECOND_LEG_PNR_VARIANT_PAYLOAD);
    expect(second.created.some((obj) => Obj.instanceOf(Trip.Trip, obj))).toBe(false);
    expect(second.updated).toHaveLength(1);
    expect((second.updated![0] as Trip.Trip).id).toBe(trip.id);

    for (const obj of second.created) {
      db.add(obj);
    }
    await db.flush();
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(1);
    expect(trips[0].segments).toHaveLength(2);
  });

  test('extract — a separately-booked leg within the gap joins the nearby Trip', async ({ expect }) => {
    const first = await extract(unitedConfirmationRaw, UNITED_PAYLOAD);
    for (const obj of first.created) {
      db.add(obj);
    }
    await db.flush();
    const trip = first.created.find((obj) => Obj.instanceOf(Trip.Trip, obj)) as Trip.Trip;

    // Different PNR (GAP111), but within 28 days of the trip → joins it with a new Booking + Segment.
    const second = await extract(unitedConfirmationRaw, NEARBY_LEG_PAYLOAD);
    expect(second.created.some((obj) => Obj.instanceOf(Trip.Trip, obj))).toBe(false);
    expect(second.created.some((obj) => Obj.instanceOf(Booking.Booking, obj))).toBe(true);
    expect(second.updated).toHaveLength(1);
    expect((second.updated![0] as Trip.Trip).id).toBe(trip.id);

    for (const obj of second.created) {
      db.add(obj);
    }
    await db.flush();
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(1);
    expect(trips[0].segments).toHaveLength(2);
  });

  test('extract — a leg beyond the gap starts a new Trip', async ({ expect }) => {
    const first = await extract(unitedConfirmationRaw, UNITED_PAYLOAD);
    for (const obj of first.created) {
      db.add(obj);
    }
    await db.flush();

    // ~3 months later under a different PNR → not grouped; a separate Trip.
    const second = await extract(unitedConfirmationRaw, FAR_LEG_PAYLOAD);
    expect(second.created.some((obj) => Obj.instanceOf(Trip.Trip, obj))).toBe(true);

    for (const obj of second.created) {
      db.add(obj);
    }
    await db.flush();
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(2);
  });

  test('extract — recognises a train booking and creates a train Segment', async ({ expect }) => {
    const result = await extract(genericConfirmationRaw, TRAIN_PAYLOAD);

    const segment = result.created.find((obj) => Obj.instanceOf(Segment.Segment, obj)) as Segment.Segment;
    expect(segment.details._tag).toBe('train');
    if (segment.details._tag !== 'train') {
      throw new Error('expected train details');
    }
    expect(segment.details.number).toBe('AP 182');
    expect(segment.details.platform).toBe('4');
    expect(segment.details.coach).toBe('12');
    expect(segment.details.provider?.name).toBe('Alfa Pendular');
  });
});

const AIR_FRANCE_RAW = [
  'From: noreply@airfrance.com',
  'Subject: Flight confirmation',
  '',
  'Air France booking confirmation.',
].join('\n');
