//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { type Database, Filter, Obj, Type } from '@dxos/echo';
import {
  type ExtractInput,
  type ExtractResult,
  type ExtractionTemplate,
  type MatchResult,
  type ObjectExtractor,
  fromResolvers,
  makeTemplateExtractor,
} from '@dxos/extractor';
import { type ContentBlock, Message } from '@dxos/types';

import { Booking, Segment, Trip, TripOperation } from '../../types';

/**
 * Template-driven extractor for travel-booking confirmation emails. A cheap/fast LLM parses the
 * email body into a single flight segment (number, route, times, confirmation, gate/terminal/seat),
 * and the framework assembles the object graph: an existing Segment matching `(number, departAt date)`
 * is updated in place; otherwise a fresh `Trip` + `Booking` + flight `Segment` trio is created
 * (Booking + Segment hang off the Trip). The `match()` pre-filter (sender domain / subject keywords)
 * keeps the LLM off non-travel mail.
 */
export const ID = 'org.dxos.plugin.trip.extractor.trip';

const UNITED_DOMAIN_REGEX = /@(?:[\w-]+\.)?united\.(?:com|co\.uk)$/i;
const CONFIRMATION_SUBJECT_REGEX = /(?:flight|booking)\s+confirmation/i;
const GATE_SUBJECT_REGEX = /gate\s+change|schedule\s+change|flight\s+update/i;

const getBodyText = (message: Message.Message): string =>
  message.blocks
    .filter((block): block is ContentBlock.Text => block._tag === 'text')
    .map((block) => block.text)
    .join('\n');

const getSubject = (message: Message.Message): string => String(message.properties?.subject ?? '');

const matchMessage = (source: Obj.Any): MatchResult => {
  const message = source as Message.Message;
  const senderEmail = message.sender?.email ?? '';
  const subject = getSubject(message);
  const domainMatched = UNITED_DOMAIN_REGEX.test(senderEmail);
  const subjectMatched = CONFIRMATION_SUBJECT_REGEX.test(subject) || GATE_SUBJECT_REGEX.test(subject);
  if (!domainMatched && !subjectMatched) {
    return { matched: false };
  }

  const confidence = domainMatched && subjectMatched ? 0.9 : domainMatched ? 0.8 : 0.5;
  return { matched: true, confidence, reason: domainMatched ? 'sender-domain' : 'subject-keyword' };
};

/** Structured output the LLM produces for the first flight segment in the email. */
const PlacePayload = Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) });

const FlightPayload = Schema.Struct({
  number: Schema.optional(Schema.String),
  origin: Schema.optional(PlacePayload),
  destination: Schema.optional(PlacePayload),
  departAt: Schema.optional(Schema.String),
  arriveAt: Schema.optional(Schema.String),
  confirmationCode: Schema.optional(Schema.String),
  gateFrom: Schema.optional(Schema.String),
  terminalFrom: Schema.optional(Schema.String),
  seat: Schema.optional(Schema.String),
  provider: Schema.optional(
    Schema.Struct({ name: Schema.optional(Schema.String), domain: Schema.optional(Schema.String) }),
  ),
});
interface FlightPayload extends Schema.Schema.Type<typeof FlightPayload> {}

const PROMPT = [
  'Extract the FIRST flight segment from this airline booking/confirmation email.',
  'Return ISO 8601 UTC timestamps for departAt and arriveAt, and IATA airport codes for origin.code/destination.code.',
  'Include the airline reservation/confirmation code and, if present, gate, terminal, and seat.',
  'If the email is not a flight confirmation, return empty fields.',
].join(' ');

/** Identity key used to dedupe segments across multiple emails. */
const matchKey = (number: string, departAt: string): string => `${number.toUpperCase()}|${departAt.split('T')[0]}`;

const isSameFlight = (segment: Segment.Segment, payload: FlightPayload): boolean => {
  if (segment.details._tag !== 'flight' || !segment.details.number || !segment.details.departAt) {
    return false;
  }
  if (!payload.number || !payload.departAt) {
    return false;
  }
  return matchKey(segment.details.number, segment.details.departAt) === matchKey(payload.number, payload.departAt);
};

const findExistingFlight = (
  db: Database.Database,
  payload: FlightPayload,
): Effect.Effect<Segment.Segment | undefined> => {
  if (!payload.number || !payload.departAt) {
    return Effect.succeed(undefined);
  }
  return Effect.promise(() => db.query(Filter.type(Segment.Segment)).run()).pipe(
    Effect.map((segments) => segments.find((segment) => isSameFlight(segment, payload))),
    // Recover (e.g. Segment type not registered, db closed) to undefined rather than letting an
    // unhandled rejection bubble through the operation handler.
    Effect.catchAllDefect(() => Effect.succeed(undefined)),
  );
};

const tripNameFor = (payload: FlightPayload): string => {
  const origin = payload.origin?.code ?? '?';
  const destination = payload.destination?.code ?? '?';
  const flight = payload.number ?? '';
  return flight ? `${origin} → ${destination} (${flight})` : `${origin} → ${destination}`;
};

const assemble = (
  payload: FlightPayload,
  { db, source }: { db: Database.Database; source: Obj.Any; template: ExtractionTemplate },
): Effect.Effect<ExtractResult> =>
  Effect.gen(function* () {
    // Without flight identity there is nothing useful to persist.
    if (!payload.number || !payload.departAt) {
      return { created: [], updated: [], relations: [] };
    }

    // Update an existing segment with the same (number, depart-date) pair.
    const existing = yield* findExistingFlight(db, payload);
    if (existing && existing.details._tag === 'flight') {
      Obj.update(existing, (existing) => {
        if (existing.details._tag !== 'flight') {
          return;
        }
        if (payload.origin !== undefined) {
          existing.details.origin = payload.origin;
        }
        if (payload.destination !== undefined) {
          existing.details.destination = payload.destination;
        }
        if (payload.arriveAt !== undefined) {
          existing.details.arriveAt = payload.arriveAt;
        }
        if (payload.gateFrom !== undefined) {
          existing.details.gateFrom = payload.gateFrom;
        }
        if (payload.terminalFrom !== undefined) {
          existing.details.terminalFrom = payload.terminalFrom;
        }
        if (payload.seat !== undefined) {
          existing.details.seat = payload.seat;
        }
      });
      return { created: [], updated: [existing], relations: [] };
    }

    // No prior segment — create a Trip + Booking + flight Segment trio.
    const provider = {
      name: payload.provider?.name ?? 'Air France',
      domain: payload.provider?.domain ?? 'united.com',
    };

    const booking = Booking.make({
      provider,
      confirmationCode: payload.confirmationCode,
      source: 'email',
      rawPayload: getBodyText(source as Message.Message),
    });

    const segment = Segment.make({
      details: {
        _tag: 'flight',
        origin: payload.origin,
        destination: payload.destination,
        departAt: payload.departAt,
        arriveAt: payload.arriveAt,
        number: payload.number,
        provider,
        gateFrom: payload.gateFrom,
        terminalFrom: payload.terminalFrom,
        seat: payload.seat,
      },
    });

    const trip = Trip.make({
      name: tripNameFor(payload),
      start: payload.departAt,
      end: payload.arriveAt,
    });
    Trip.addSegment(trip, segment);
    // Anchor the Booking under the Trip so the dispatcher treats it as a child — only top-level
    // objects (no parent) get a provenance relation back to the message, so the message header
    // surfaces the Trip itself rather than a chip per sub-artifact.
    Obj.setParent(booking, trip);

    return { created: [trip, booking, segment], updated: [], relations: [] };
  });

const template: ExtractionTemplate = {
  id: ID,
  description: 'Recognises airline booking confirmations and produces Bookings + flight Segments.',
  kinds: ['flight'],
  sourceTypes: [Type.getTypename(Message.Message)!],
  prompt: PROMPT,
  targets: [
    { type: Type.getTypename(Trip.Trip)! },
    {
      type: Type.getTypename(Segment.Segment)!,
      parent: Type.getTypename(Trip.Trip)!,
      identity: { fields: ['number', 'departAt'] },
    },
    { type: Type.getTypename(Booking.Booking)!, parent: Type.getTypename(Trip.Trip)! },
  ],
  tags: [{ label: 'travel', hue: 'sky' }],
};

/** Template-driven extractor — recognises airline booking confirmations. */
export const TripMessageExtractor: ObjectExtractor = makeTemplateExtractor({
  template,
  operation: TripOperation.ExtractTrip,
  payloadSchema: FlightPayload,
  match: matchMessage,
  getSourceText: (source) => getBodyText(source as Message.Message),
  assemble,
});

/**
 * Operation handler — wraps the extractor so it is also a first-class registered operation. The
 * trip assembly does not resolve via the `Resolver` (it dedupes segments by a direct db query),
 * so an empty resolver layer is provided to satisfy the requirement. Returns ExtractResult
 * without touching the database; the dispatcher persists.
 */
const handler: Operation.WithHandler<typeof TripOperation.ExtractTrip> = TripOperation.ExtractTrip.pipe(
  Operation.withHandler((input: ExtractInput) =>
    TripMessageExtractor.extract(input).pipe(Effect.provide(fromResolvers({}))),
  ),
);

export default handler;
