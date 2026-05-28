//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Filter, Obj, type Database } from '@dxos/echo';
import { type MessageExtractor } from '@dxos/plugin-inbox';
import { type ContentBlock, type Message } from '@dxos/types';

import { Booking, Segment, TripOperation } from '../../types';

/**
 * Heuristic v1 extractor for travel-booking confirmation emails. Recognises
 * United-style flight confirmations: a sender on a united.com domain or a
 * subject mentioning a flight/booking confirmation, with a plain-text body
 * of the form:
 *
 * ```text
 *   Flight: AF-1
 *   From: SFO (San Francisco)
 *   To: LHR (London Heathrow)
 *   Depart: 2026-06-01 15:30
 *   Arrive: 2026-06-02 09:30
 *   Confirmation: ABC123
 *   Gate: 21B
 * ```
 *
 * Create-or-update: existing flight segments in `ctx.database` are looked up
 * by `(number, departAt date)`. A match is mutated in place (returned in
 * `updated`) and a fresh `Booking` is NOT emitted; otherwise a new `Booking`
 * + `Segment` pair is created.
 */
export const ID = 'org.dxos.plugin.trip.extractor.trip';

const UNITED_DOMAIN_REGEX = /@(?:[\w-]+\.)?united\.(?:com|co\.uk)$/i;
const CONFIRMATION_SUBJECT_REGEX = /(?:flight|booking)\s+confirmation/i;
const GATE_SUBJECT_REGEX = /gate\s+change|schedule\s+change|flight\s+update/i;

const FLIGHT_REGEX = /Flight:\s*([A-Z]{1,3}-?\d{1,5})/i;
const FROM_REGEX = /From:\s*([A-Z]{3})(?:\s*\(([^)]+)\))?/;
const TO_REGEX = /To:\s*([A-Z]{3})(?:\s*\(([^)]+)\))?/;
const DEPART_REGEX = /Depart:\s*(\d{4}-\d{2}-\d{2})[\sT]+(\d{2}:\d{2})/;
const ARRIVE_REGEX = /Arrive:\s*(\d{4}-\d{2}-\d{2})[\sT]+(\d{2}:\d{2})/;
const CONFIRMATION_CODE_REGEX = /Confirmation:\s*([A-Z0-9]{4,})/i;
const GATE_REGEX = /Gate:\s*([A-Z0-9]+)/i;
const TERMINAL_REGEX = /Terminal:\s*([A-Z0-9]+)/i;
const SEAT_REGEX = /Seat:\s*([A-Z0-9]+)/i;

const getBodyText = (message: Message.Message): string =>
  message.blocks
    .filter((block): block is ContentBlock.Text => block._tag === 'text')
    .map((block) => block.text)
    .join('\n');

const getSubject = (message: Message.Message): string => String(message.properties?.subject ?? '');

const toIso = (datePart: string, timePart: string): string => `${datePart}T${timePart}:00.000Z`;

const matchMessage = (message: Message.Message): MessageExtractor.MatchResult => {
  const senderEmail = message.sender.email ?? '';
  const subject = getSubject(message);
  const domainMatched = UNITED_DOMAIN_REGEX.test(senderEmail);
  const subjectMatched = CONFIRMATION_SUBJECT_REGEX.test(subject) || GATE_SUBJECT_REGEX.test(subject);
  if (!domainMatched && !subjectMatched) {
    return { matched: false };
  }

  const confidence = domainMatched && subjectMatched ? 0.9 : domainMatched ? 0.8 : 0.5;
  return { matched: true, confidence, reason: domainMatched ? 'sender-domain' : 'subject-keyword' };
};

/**
 * Parsed candidate fields from an email body. Only `number` + `departAt`
 * are required for the create-or-update identity lookup; everything else is
 * optional and merged when present.
 */
/** Inline Place shape — keeping the candidate dependency-free of the nominal Place.Place interface so structural assignment to Segment fields stays straightforward. */
type PlaceCandidate = { code: string; name?: string };

type Candidate = {
  number?: string;
  origin?: PlaceCandidate;
  destination?: PlaceCandidate;
  departAt?: string;
  arriveAt?: string;
  confirmationCode?: string;
  gateFrom?: string;
  terminalFrom?: string;
  seat?: string;
};

const parseCandidate = (body: string): Candidate => {
  const flight = FLIGHT_REGEX.exec(body);
  const from = FROM_REGEX.exec(body);
  const to = TO_REGEX.exec(body);
  const depart = DEPART_REGEX.exec(body);
  const arrive = ARRIVE_REGEX.exec(body);
  const confirmation = CONFIRMATION_CODE_REGEX.exec(body);
  const gate = GATE_REGEX.exec(body);
  const terminal = TERMINAL_REGEX.exec(body);
  const seat = SEAT_REGEX.exec(body);

  return {
    number: flight?.[1],
    origin: from ? { code: from[1], name: from[2] ?? undefined } : undefined,
    destination: to ? { code: to[1], name: to[2] ?? undefined } : undefined,
    departAt: depart ? toIso(depart[1], depart[2]) : undefined,
    arriveAt: arrive ? toIso(arrive[1], arrive[2]) : undefined,
    confirmationCode: confirmation?.[1],
    gateFrom: gate?.[1],
    terminalFrom: terminal?.[1],
    seat: seat?.[1],
  };
};

/** Identity key used to dedupe segments across multiple emails. */
const matchKey = (number: string, departAt: string): string => `${number.toUpperCase()}|${departAt.split('T')[0]}`;

const isSameFlight = (segment: Segment.Segment, candidate: Candidate): boolean => {
  if (segment.details._tag !== 'flight' || !segment.details.number || !segment.details.departAt) {
    return false;
  }
  if (!candidate.number || !candidate.departAt) {
    return false;
  }
  return matchKey(segment.details.number, segment.details.departAt) === matchKey(candidate.number, candidate.departAt);
};

const extractFromMessage = (
  db: Database.Database,
  message: Message.Message,
): Effect.Effect<MessageExtractor.ExtractResult, never> =>
  Effect.gen(function* () {
    const body = getBodyText(message);
    const candidate = parseCandidate(body);

    // `match()` can accept subject-only signals (e.g. generic "booking confirmation" emails);
    // without flight identity we have nothing useful to persist, so emit no objects.
    if (!candidate.number || !candidate.departAt) {
      return { created: [], updated: [], relations: [] };
    }

    // Try to find an existing segment matching the same (number, depart-date) pair.
    const existing = yield* findExistingFlight(db, candidate);
    if (existing && existing.details._tag === 'flight') {
      Obj.update(existing, (existing) => {
        if (existing.details._tag !== 'flight') {
          return;
        }
        if (candidate.origin !== undefined) {
          existing.details.origin = candidate.origin;
        }
        if (candidate.destination !== undefined) {
          existing.details.destination = candidate.destination;
        }
        if (candidate.arriveAt !== undefined) {
          existing.details.arriveAt = candidate.arriveAt;
        }
        if (candidate.gateFrom !== undefined) {
          existing.details.gateFrom = candidate.gateFrom;
        }
        if (candidate.terminalFrom !== undefined) {
          existing.details.terminalFrom = candidate.terminalFrom;
        }
        if (candidate.seat !== undefined) {
          existing.details.seat = candidate.seat;
        }
      });
      return { created: [], updated: [existing], relations: [] };
    }

    // No prior segment — create a Booking + flight Segment pair.
    const booking = Booking.make({
      provider: { name: 'Air France', domain: 'united.com' },
      confirmationCode: candidate.confirmationCode,
      source: 'email',
      rawPayload: body,
    });

    const segment = Segment.make({
      details: {
        _tag: 'flight',
        origin: candidate.origin,
        destination: candidate.destination,
        departAt: candidate.departAt,
        arriveAt: candidate.arriveAt,
        number: candidate.number,
        provider: { name: 'Air France', domain: 'united.com' },
        gateFrom: candidate.gateFrom,
        terminalFrom: candidate.terminalFrom,
        seat: candidate.seat,
      },
    });

    return { created: [booking, segment], updated: [], relations: [] };
  });

const findExistingFlight = (
  db: Database.Database,
  candidate: Candidate,
): Effect.Effect<Segment.Segment | undefined, never> => {
  if (!candidate.number || !candidate.departAt) {
    return Effect.succeed(undefined);
  }

  return Effect.promise(() => db.query(Filter.type(Segment.Segment)).run()).pipe(
    Effect.map((segments) => segments.find((segment) => isSameFlight(segment, candidate))),
    // If the query rejects (e.g. Segment type not registered, db closed), recover to
    // undefined rather than letting an unhandled rejection bubble up through the
    // operation handler as an opaque "unknown error occurred in Effect.tryPromise".
    Effect.catchAllDefect(() => Effect.succeed(undefined)),
  );
};

const extract = ({
  db,
  message,
}: MessageExtractor.ExtractInput): Effect.Effect<MessageExtractor.ExtractResult, never> =>
  extractFromMessage(db, message);

/**
 * Operation handler for the travel extractor — wraps the inline `extract` so the extractor
 * is also a first-class registered operation. Returns ExtractResult without touching the
 * database; the ExtractMessage dispatcher persists.
 */
const handler: Operation.WithHandler<typeof TripOperation.ExtractTrip> = TripOperation.ExtractTrip.pipe(
  Operation.withHandler(extract),
);

export default handler;

/** Heuristic v1 extractor — recognises United-style flight confirmations. */
export const TripMessageExtractor: MessageExtractor.MessageExtractor = {
  id: ID,
  description: 'Recognises airline booking confirmations and produces Bookings + flight Segments.',
  kinds: ['flight'],
  match: matchMessage,
  operation: TripOperation.ExtractTrip,
  extract,
};
