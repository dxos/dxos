//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { type Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import {
  type ExtractInput,
  type ExtractResult,
  type ExtractionTemplate,
  type MatchResult,
  type ObjectExtractor,
  fromResolvers,
  makeTemplateExtractor,
} from '@dxos/extractor';
import { log } from '@dxos/log';
import { type ContentBlock, Message, Organization, type Provider } from '@dxos/types';
import { trim } from '@dxos/util';

import { Booking, Segment, Trip, TripOperation } from '../../types';
import { AIRLINE_DOMAINS, AIRLINE_NAMES } from './const';

/**
 * Template-driven extractor for travel-booking confirmation emails. A cheap/fast LLM parses the
 * email body into a single flight segment (number, route, times, confirmation, gate/terminal/seat),
 * and the framework assembles the object graph:
 *  - an existing Segment matching `(number, departAt date)` is updated in place;
 *  - otherwise a fresh flight Segment is created and attached to the Trip whose Booking shares the
 *    confirmation code (PNR) — producing one Trip with multiple Segments — or, when no such Trip
 *    exists, a new `Trip` + `Booking` + `Segment` trio.
 * The flight provider (airline) is derived from the sender domain + flight-number prefix and
 * linked to a matching Organization. The `match()` pre-filter (sender domain / subject keywords)
 * keeps the LLM off non-travel mail.
 */
export const TEMPLATE_ID = 'org.dxos.plugin.trip.extractor.trip';

// Travel-related subject keywords used by the cheap `match()` pre-filter. Generous on purpose —
// the LLM returns empty fields for non-flight mail, so a false positive costs only one cheap call.
const TRAVEL_SUBJECT_REGEX =
  /\b(?:flight|booking|e-?ticket|itinerary|reservation|boarding|gate\s+change|schedule\s+change)\b/i;

const senderDomain = (message: Message.Message): string => (message.sender?.email ?? '').split('@')[1]?.toLowerCase() ?? '';

const isAirlineDomain = (domain: string): boolean =>
  AIRLINE_DOMAINS.some((airline) => domain === airline || domain.endsWith(`.${airline}`));

const getBodyText = (message: Message.Message): string =>
  message.blocks
    .filter((block): block is ContentBlock.Text => block._tag === 'text')
    .map((block) => block.text)
    .join('\n');

const getSubject = (message: Message.Message): string => String(message.properties?.subject ?? '');

const matchMessage = (source: Obj.Any): MatchResult => {
  const message = source as Message.Message;
  const subject = getSubject(message);
  const domainMatched = isAirlineDomain(senderDomain(message));
  const subjectMatched = TRAVEL_SUBJECT_REGEX.test(subject);
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

const PROMPT = trim`
  Extract the FIRST flight segment from this airline booking/confirmation email.
  Return ISO 8601 UTC timestamps for departAt and arriveAt, and IATA airport codes for origin.code/destination.code.
  Include the airline reservation/confirmation code and, if present, gate, terminal, and seat.
  If the email is not a flight confirmation, return empty fields.
`;

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

/**
 * Find an existing Booking with this confirmation code (PNR). Flights booked under one
 * reservation share a code, so a follow-up segment attaches to that Booking's Trip rather than
 * spawning a new one. The Booking is parented to its Trip via `Obj.setParent`.
 */
const findExistingBookingByConfirmation = (
  db: Database.Database,
  confirmationCode: string | undefined,
): Effect.Effect<Booking.Booking | undefined> => {
  if (!confirmationCode) {
    return Effect.succeed(undefined);
  }
  return Effect.promise(() => db.query(Filter.type(Booking.Booking)).run()).pipe(
    Effect.map((bookings) => bookings.find((booking) => booking.confirmationCode === confirmationCode)),
    Effect.catchAllDefect(() => Effect.succeed(undefined)),
  );
};

const tripNameFor = (payload: FlightPayload): string => {
  const origin = payload.origin?.code ?? '?';
  const destination = payload.destination?.code ?? '?';
  const flight = payload.number ?? '';
  return flight ? `${origin} → ${destination} (${flight})` : `${origin} → ${destination}`;
};

const makeSegment = (payload: FlightPayload, provider: Provider.Provider, booking: Booking.Booking): Segment.Segment =>
  Segment.make({
    booking: Ref.make(booking),
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

/** Widen a Trip's date range to cover a newly-appended segment (ISO timestamps compare lexically). */
const widenTripRange = (trip: Trip.Trip, payload: FlightPayload): void => {
  Obj.update(trip, (trip) => {
    if (payload.departAt && (!trip.start || payload.departAt < trip.start)) {
      trip.start = payload.departAt;
    }
    if (payload.arriveAt && (!trip.end || payload.arriveAt > trip.end)) {
      trip.end = payload.arriveAt;
    }
  });
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

    const message = source as Message.Message;

    // Case 1: an existing segment with the same (number, depart-date) pair — update it in place
    // (e.g. gate/terminal change). Surface its owning Trip in `updated` so the source message
    // also gets a provenance relation to the Trip.
    const existingSegment = yield* findExistingFlight(db, payload);
    if (existingSegment && existingSegment.details._tag === 'flight') {
      Obj.update(existingSegment, (existingSegment) => {
        if (existingSegment.details._tag !== 'flight') {
          return;
        }
        if (payload.origin !== undefined) {
          existingSegment.details.origin = payload.origin;
        }
        if (payload.destination !== undefined) {
          existingSegment.details.destination = payload.destination;
        }
        if (payload.arriveAt !== undefined) {
          existingSegment.details.arriveAt = payload.arriveAt;
        }
        if (payload.gateFrom !== undefined) {
          existingSegment.details.gateFrom = payload.gateFrom;
        }
        if (payload.terminalFrom !== undefined) {
          existingSegment.details.terminalFrom = payload.terminalFrom;
        }
        if (payload.seat !== undefined) {
          existingSegment.details.seat = payload.seat;
        }
      });
      const owningTrip = Obj.getParent(existingSegment);
      const updated = Trip.instanceOf(owningTrip) ? [owningTrip, existingSegment] : [existingSegment];
      return { created: [], updated, relations: [] };
    }

    // The provider (airline) is derived from the sender domain + flight-number prefix and linked
    // to a matching Organization.
    const provider = yield* resolveProvider(db, payload, message);

    // Case 2: a new flight that belongs to an existing Trip (same confirmation code / PNR) —
    // attach a fresh Segment to that Trip (and its existing Booking). Only the Trip (top-level)
    // gets provenance; the new Segment is parented to it via `Trip.addSegment`.
    const existingBooking = yield* findExistingBookingByConfirmation(db, payload.confirmationCode);
    const existingTrip = existingBooking ? Obj.getParent(existingBooking) : undefined;
    if (existingBooking && Trip.instanceOf(existingTrip)) {
      const segment = makeSegment(payload, provider, existingBooking);
      Trip.addSegment(existingTrip, segment);
      widenTripRange(existingTrip, payload);
      return { created: [segment], updated: [existingTrip], relations: [] };
    }

    // Case 3: a brand-new trip — create a Trip + Booking + flight Segment trio.
    const booking = Booking.make({
      provider,
      confirmationCode: payload.confirmationCode,
      source: 'email',
      rawPayload: getBodyText(message),
    });

    const segment = makeSegment(payload, provider, booking);

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

/** Leading two-letter IATA code of a flight number (e.g. "AF0003" → "AF"). */
const airlineCodeOf = (flightNumber: string | undefined): string | undefined =>
  flightNumber?.match(/^([A-Za-z]{2})/)?.[1]?.toUpperCase();

/** Title-case a domain's second-level label as a provider-name fallback (airfrance.com → Airfrance). */
const domainToName = (domain: string): string => {
  const label = domain.split('.')[0] ?? domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Whether an Organization website matches the sender domain (host equality or sub-domain either way). */
const matchesDomain = (website: string | undefined, domain: string): boolean => {
  if (!website) {
    return false;
  }
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
  } catch (err) {
    log.warn('parsing organization website', { website, err });
    return false;
  }
};

/**
 * Builds the flight provider: `domain` from the sender's email, `name` from the airline-prefix
 * map (sender-domain fallback), and a `ref` to an existing Organization when one matches by
 * website domain or name.
 */
const resolveProvider = (
  db: Database.Database,
  payload: FlightPayload,
  message: Message.Message,
): Effect.Effect<Provider.Provider, never> =>
  Effect.gen(function* () {
    const domain = payload.provider?.domain ?? senderDomain(message);
    const code = airlineCodeOf(payload.number);
    const name = payload.provider?.name ?? (code && AIRLINE_NAMES[code]) ?? (domain ? domainToName(domain) : undefined);
    if (!domain && !name) {
      return {};
    }

    const orgs = yield* Effect.promise(() => db.query(Filter.type(Organization.Organization)).run()).pipe(
      Effect.catchAllDefect(() => Effect.succeed([] as Organization.Organization[])),
    );
    const match = orgs.find(
      (org) =>
        (!!domain && matchesDomain(org.website, domain)) || (!!name && org.name?.toLowerCase() === name.toLowerCase()),
    );

    return {
      ...(name ? { name } : {}),
      ...(domain ? { domain } : {}),
      ...(match ? { ref: Ref.make(match) } : {}),
    };
  });

const template: ExtractionTemplate = {
  id: TEMPLATE_ID,
  title: 'Trip',
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
