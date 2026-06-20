//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Event } from '@dxos/types';

import { Segment, Trip } from '../types';
import { buildTripFromEvents, defaultTripName, eventsSpan, eventsToSegments } from './events-to-segments';

describe('eventsToSegments', () => {
  test('maps only events that have a location to activity segments', ({ expect }) => {
    const events = [
      event({
        title: 'Conference',
        startDate: '2026-06-08T09:00:00.000Z',
        endDate: '2026-06-08T17:00:00.000Z',
        location: { street: '1 Market St', locality: 'San Francisco', region: 'CA', country: 'US' },
      }),
      event({ title: 'Phone call', startDate: '2026-06-09T09:00:00.000Z', endDate: '2026-06-09T10:00:00.000Z' }),
    ];

    const segments = eventsToSegments(events);
    expect(segments).toHaveLength(1);
    const [segment] = segments;
    expect(Segment.getKind(segment)).toBe('activity');
    expect(segment.details._tag === 'activity' && segment.details.title).toBe('Conference');
    const origin = Segment.getOrigin(segment);
    expect(origin?.name).toBe('1 Market St');
    expect(origin?.city).toBe('San Francisco');
    expect(origin?.country).toBe('US');
    expect(Segment.getDepartAt(segment)).toBe('2026-06-08T09:00:00.000Z');
    expect(Segment.getArriveAt(segment)).toBe('2026-06-08T17:00:00.000Z');
  });

  test('falls back to locality then title for the place name', ({ expect }) => {
    const [byLocality] = eventsToSegments([
      event({
        title: 'Meeting',
        startDate: '2026-06-08T09:00:00.000Z',
        endDate: '2026-06-08T10:00:00.000Z',
        location: { locality: 'Bangkok', country: 'TH' },
      }),
    ]);
    expect(Segment.getOrigin(byLocality)?.name).toBe('Bangkok');

    const [byTitle] = eventsToSegments([
      event({
        title: 'Summit',
        startDate: '2026-06-08T09:00:00.000Z',
        endDate: '2026-06-08T10:00:00.000Z',
        location: { country: 'TH' },
      }),
    ]);
    expect(Segment.getOrigin(byTitle)?.name).toBe('Summit');
  });
});

describe('eventsSpan', () => {
  test('returns the earliest start and latest end', ({ expect }) => {
    const span = eventsSpan([
      event({ startDate: '2026-06-10T09:00:00.000Z', endDate: '2026-06-10T10:00:00.000Z' }),
      event({ startDate: '2026-06-08T09:00:00.000Z', endDate: '2026-06-08T12:00:00.000Z' }),
      event({ startDate: '2026-06-09T09:00:00.000Z', endDate: '2026-06-12T18:00:00.000Z' }),
    ]);
    expect(span.start).toBe('2026-06-08T09:00:00.000Z');
    expect(span.end).toBe('2026-06-12T18:00:00.000Z');
  });

  test('is empty for no events', ({ expect }) => {
    expect(eventsSpan([])).toEqual({ start: undefined, end: undefined });
  });
});

describe('defaultTripName', () => {
  test('formats a date range', ({ expect }) => {
    expect(defaultTripName('2026-06-08T00:00:00.000Z', '2026-06-14T00:00:00.000Z')).toBe('Trip · Jun 8 – Jun 14');
  });

  test('handles a single date and the empty case', ({ expect }) => {
    expect(defaultTripName('2026-06-08T00:00:00.000Z')).toBe('Trip · Jun 8');
    expect(defaultTripName()).toBe('Trip');
  });
});

describe('buildTripFromEvents', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Trip.Trip, Segment.Segment] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  test('persists a trip spanning the events with one activity segment per located event', async ({ expect }) => {
    const events = [
      event({
        title: 'Day 1',
        startDate: '2026-06-08T09:00:00.000Z',
        endDate: '2026-06-08T17:00:00.000Z',
        location: { locality: 'San Francisco', country: 'US' },
      }),
      event({
        title: 'Day 3',
        startDate: '2026-06-10T09:00:00.000Z',
        endDate: '2026-06-10T17:00:00.000Z',
        location: { locality: 'Los Angeles', country: 'US' },
      }),
      event({ title: 'No location', startDate: '2026-06-09T09:00:00.000Z', endDate: '2026-06-09T10:00:00.000Z' }),
    ];

    const trip = buildTripFromEvents(db, events);
    await db.flush();

    expect(trip.name).toBe('Trip · Jun 8 – Jun 10');
    expect(trip.start).toBe('2026-06-08T09:00:00.000Z');
    expect(trip.end).toBe('2026-06-10T17:00:00.000Z');
    const segments = Trip.getSegments(trip);
    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => Segment.getKind(segment) === 'activity')).toBe(true);
  });

  test('honors an explicit name', async ({ expect }) => {
    const trip = buildTripFromEvents(
      db,
      [event({ startDate: '2026-06-08T09:00:00.000Z', endDate: '2026-06-08T10:00:00.000Z' })],
      'Summer trip',
    );
    await db.flush();
    expect(trip.name).toBe('Summer trip');
  });
});

const event = (props: { title?: string; startDate: string; endDate: string; location?: Event.Event['location'] }) =>
  Event.make({ owner: {}, ...props });
