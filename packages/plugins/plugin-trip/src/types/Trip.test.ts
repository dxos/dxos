//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import * as Segment from './Segment';
import * as Trip from './Trip';

describe('Trip', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({ types: [Trip.Trip, Segment.Segment] });
    db = result.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('addSegment', () => {
    test('adds segment to persisted trip without ParseError', async ({ expect }) => {
      const trip = db.add(Trip.make({ name: 'Trip' }));
      await db.flush();

      const segment = db.add(Segment.makeDefault('flight'));
      Trip.addSegment(trip, segment);

      expect(trip.segments.length).toBe(1);
      const ref = trip.segments[0];
      expect(Ref.isRef(ref)).toBe(true);
      expect(ref.target?.id).toBe(segment.id);
    });

    test('adds multiple segments to persisted trip', async ({ expect }) => {
      const trip = db.add(Trip.make({ name: 'Trip' }));
      await db.flush();

      const a = db.add(Segment.makeDefault('flight'));
      const b = db.add(Segment.makeDefault('accommodation'));
      Trip.addSegment(trip, a);
      Trip.addSegment(trip, b);

      expect(trip.segments.length).toBe(2);
      expect(trip.segments[0].target?.id).toBe(a.id);
      expect(trip.segments[1].target?.id).toBe(b.id);
    });

    test('works on transient trip prior to db.add (builder pattern)', async ({ expect }) => {
      const trip = Trip.make({ name: 'Trip' });
      const segment = Segment.makeDefault('flight');
      Trip.addSegment(trip, segment);

      db.add(segment);
      db.add(trip);
      await db.flush();

      expect(trip.segments.length).toBe(1);
      expect(trip.segments[0].target?.id).toBe(segment.id);
    });
  });

  describe('removeSegment', () => {
    test('removes segment by id from persisted trip', async ({ expect }) => {
      const trip = db.add(Trip.make({ name: 'Trip' }));
      const a = db.add(Segment.makeDefault('flight'));
      const b = db.add(Segment.makeDefault('accommodation'));
      Trip.addSegment(trip, a);
      Trip.addSegment(trip, b);
      await db.flush();

      Trip.removeSegment(trip, a.id);

      expect(trip.segments.length).toBe(1);
      expect(trip.segments[0].target?.id).toBe(b.id);
    });

    test('no-op when segment id is not in trip', async ({ expect }) => {
      const trip = db.add(Trip.make({ name: 'Trip' }));
      const a = db.add(Segment.makeDefault('flight'));
      Trip.addSegment(trip, a);
      await db.flush();

      Trip.removeSegment(trip, 'nonexistent-id');

      expect(trip.segments.length).toBe(1);
      expect(trip.segments[0].target?.id).toBe(a.id);
    });
  });
});
