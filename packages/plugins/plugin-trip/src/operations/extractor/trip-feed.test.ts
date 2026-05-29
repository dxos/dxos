//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Relation } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { dispatch, fromExtractors, fromResolvers } from '@dxos/extractor';
import { mockAiService } from '@dxos/extractor/testing';
import { ExtractedFrom } from '@dxos/plugin-inbox';
import { ContentBlock, Message } from '@dxos/types';

import { Booking, Segment, Trip } from '../../types';
import { TripMessageExtractor } from './trip-extractor';

// Empty resolver — the trip extractor dedupes/groups via direct db queries, not the Resolver.
const noResolver = fromResolvers({});

// Provenance relation the dispatcher attaches from each top-level extracted object to the source.
const provenance = ({
  source,
  object,
  extractorId,
  extractedAt,
  confidence,
}: {
  source: Obj.Any;
  object: Obj.Any;
  extractorId: string;
  extractedAt: string;
  confidence?: number;
}) =>
  ExtractedFrom.make({
    [Relation.Source]: object,
    [Relation.Target]: source,
    extractorId,
    extractedAt,
    confidence,
  });

const makeMessage = (props: { from: string; subject: string; body: string }): Message.Message =>
  Obj.make(Message.Message, {
    created: new Date('2026-05-25T00:00:00.000Z').toISOString(),
    sender: { email: props.from },
    properties: { subject: props.subject },
    blocks: [ContentBlock.Text.make({ text: props.body })],
  });

// One booking (PNR ABC123) with two legs, plus a gate change for the first leg.
const FIRST_LEG = {
  number: 'AF-1',
  origin: { code: 'SFO', name: 'San Francisco' },
  destination: { code: 'LHR', name: 'London Heathrow' },
  departAt: '2026-06-01T15:30:00.000Z',
  arriveAt: '2026-06-02T09:30:00.000Z',
  confirmationCode: 'ABC123',
  provider: { name: 'United', domain: 'united.com' },
};

const SECOND_LEG = {
  number: 'AF-2',
  origin: { code: 'LHR', name: 'London Heathrow' },
  destination: { code: 'CDG', name: 'Paris' },
  departAt: '2026-06-05T11:00:00.000Z',
  arriveAt: '2026-06-05T13:15:00.000Z',
  confirmationCode: 'ABC123',
  provider: { name: 'United', domain: 'united.com' },
};

const GATE_CHANGE = {
  number: 'AF-1',
  origin: { code: 'SFO', name: 'San Francisco' },
  destination: { code: 'LHR', name: 'London Heathrow' },
  departAt: '2026-06-01T15:30:00.000Z',
  arriveAt: '2026-06-02T09:30:00.000Z',
  gateFrom: '21B',
  terminalFrom: '3',
};

describe('trip extraction over a message feed', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [Booking.Booking, Segment.Segment, Trip.Trip, Message.Message, ExtractedFrom.ExtractedFrom],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  test('processing a feed yields one Trip with multiple Segments and Message→Trip relations', async ({ expect }) => {
    // The "feed": a sequence of messages, each paired with the structured payload a cheap LLM
    // would extract. Two are flight legs under one PNR, one is a gate change for the first leg,
    // and one is an unrelated message that should not match.
    const feed: Array<{ message: Message.Message; payload: unknown | undefined }> = [
      {
        message: makeMessage({ from: 'no-reply@united.com', subject: 'Flight Confirmation', body: 'Leg 1' }),
        payload: FIRST_LEG,
      },
      {
        message: makeMessage({ from: 'no-reply@united.com', subject: 'Flight Confirmation', body: 'Leg 2' }),
        payload: SECOND_LEG,
      },
      {
        message: makeMessage({ from: 'no-reply@united.com', subject: 'Gate change', body: 'Gate update' }),
        payload: GATE_CHANGE,
      },
      {
        // Unrelated message — no travel sender/subject, so `match()` rejects it.
        message: makeMessage({ from: 'news@example.com', subject: 'Weekly digest', body: 'Nothing to see here.' }),
        payload: undefined,
      },
    ];

    // Persist the feed messages so provenance relations can target them.
    const messages = feed.map(({ message }) => db.add(message));
    await db.flush();

    // Iterate the feed, invoking the extract dispatcher per message. Non-matching messages fail
    // with NoMatchingExtractorError, which we tolerate via Effect.either.
    for (const { message, payload } of feed) {
      await dispatch({ db, source: message }, { provenance })
        .pipe(
          Effect.provide(
            Layer.mergeAll(
              fromExtractors([TripMessageExtractor]),
              noResolver,
              mockAiService({ object: payload ?? {} }),
            ),
          ),
        )
        .pipe(Effect.either)
        .pipe(runAndForwardErrors);
      await db.flush();
    }

    // Exactly one Trip, one Booking, two Segments.
    const trips = await db.query(Filter.type(Trip.Trip)).run();
    expect(trips).toHaveLength(1);
    const trip = trips[0];
    expect(trip.segments).toHaveLength(2);

    const bookings = await db.query(Filter.type(Booking.Booking)).run();
    expect(bookings).toHaveLength(1);
    expect(bookings[0].confirmationCode).toBe('ABC123');

    const segments = await db.query(Filter.type(Segment.Segment)).run();
    expect(segments).toHaveLength(2);
    const numbers = segments
      .map((segment) => (segment.details._tag === 'flight' ? segment.details.number : undefined))
      .sort();
    expect(numbers).toEqual(['AF-1', 'AF-2']);

    // The gate change updated the first leg in place (no duplicate segment).
    const firstLeg = segments.find(
      (segment) => segment.details._tag === 'flight' && segment.details.number === 'AF-1',
    )!;
    expect(firstLeg.details._tag).toBe('flight');
    if (firstLeg.details._tag !== 'flight') {
      throw new Error('expected flight details');
    }
    expect(firstLeg.details.gateFrom).toBe('21B');
    expect(firstLeg.details.terminalFrom).toBe('3');

    // Every contributing message (legs + gate change) has an ExtractedFrom relation to the Trip;
    // the unrelated message does not.
    const relations = await db.query(Filter.type(ExtractedFrom.ExtractedFrom)).run();
    for (const relation of relations) {
      expect(Relation.getSource(relation).id).toBe(trip.id);
    }
    const relatedMessageIds = new Set(relations.map((relation) => Relation.getTarget(relation).id));
    expect(relatedMessageIds.has(messages[0].id)).toBe(true);
    expect(relatedMessageIds.has(messages[1].id)).toBe(true);
    expect(relatedMessageIds.has(messages[2].id)).toBe(true);
    expect(relatedMessageIds.has(messages[3].id)).toBe(false);
  });
});
