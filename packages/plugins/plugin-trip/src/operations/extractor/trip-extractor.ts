//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { type Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import {
  type ExtractInput,
  type ExtractionTemplate,
  type ExtractResult,
  type MatchResult,
  type ObjectExtractor,
  fromResolvers,
  makeTemplateExtractor,
} from '@dxos/extractor';
import { log } from '@dxos/log';
import { type ContentBlock, type Provider, Message, Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { Booking, Segment, Trip, TripOperation } from '../../types';
import { getTripGapDays } from './config';
import { AIRLINES } from './const';

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
  /\b(?:flight|train|rail|eurostar|booking|e-?ticket|itinerary|reservation|boarding|gate\s+change|schedule\s+change)\b/i;

const senderDomain = (message: Message.Message): string =>
  (message.sender?.email ?? '').split('@')[1]?.toLowerCase() ?? '';

const isAirlineDomain = (domain: string): boolean =>
  AIRLINES.some((airline) => domain === airline.domain || domain.endsWith(`.${airline.domain}`));

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

const PlacePayload = Schema.Struct({ code: Schema.String, name: Schema.optional(Schema.String) });

/** Travel mode of the extracted segment. Defaults to `flight` when the LLM omits it. */
const SegmentKind = Schema.Literal('flight', 'train');

/** A single travel leg within a booking. */
const SegmentPayload = Schema.Struct({
  kind: Schema.optional(SegmentKind),
  number: Schema.optional(Schema.String),
  origin: Schema.optional(PlacePayload),
  destination: Schema.optional(PlacePayload),
  departAt: Schema.optional(Schema.String),
  arriveAt: Schema.optional(Schema.String),
  gateFrom: Schema.optional(Schema.String),
  terminalFrom: Schema.optional(Schema.String),
  // Rail-specific (kind === 'train').
  platform: Schema.optional(Schema.String),
  coach: Schema.optional(Schema.String),
  seat: Schema.optional(Schema.String),
  provider: Schema.optional(
    Schema.Struct({ name: Schema.optional(Schema.String), domain: Schema.optional(Schema.String) }),
  ),
});
interface SegmentPayload extends Schema.Schema.Type<typeof SegmentPayload> {}

/** Structured output the LLM produces: one booking with ALL of its travel legs. */
const ExtractionPayload = Schema.Struct({
  // Booking-level reservation/confirmation code (PNR) shared by every segment.
  confirmationCode: Schema.optional(Schema.String),
  segments: Schema.optional(Schema.Array(SegmentPayload)),
});
interface ExtractionPayload extends Schema.Schema.Type<typeof ExtractionPayload> {}

const PROMPT = trim`
  Extract EVERY travel segment from this booking/confirmation email — itineraries frequently have
  multiple legs (connections, round-trips, multi-city). Return them in chronological order in the
  "segments" array; do NOT stop after the first one.
  Set each segment's "kind" to "train" for rail bookings (e.g. Eurostar, Amtrak, Alfa Pendular, SNCF)
  or "flight" for air travel; default to "flight".
  Return ISO 8601 UTC timestamps for departAt and arriveAt. For flights use IATA airport codes for
  origin.code/destination.code; for trains use the station name (and code if present).
  IMPORTANT: Use the exact date stated in the email, INCLUDING the correct year — do not guess, shift,
  or default the year. If the year is ambiguous, prefer the year nearest the email's own date.
  Set the booking-level "confirmationCode" to the reservation/booking reference (it is shared by all
  segments). Include per-segment, if present: gate, terminal, seat (flights); platform, coach, seat (trains).
  If the email is not a travel confirmation, return an empty "segments" array.
`;

/** Identity key used to dedupe segments across multiple emails. */
const matchKey = (number: string, departAt: string): string => `${number.toUpperCase()}|${departAt.split('T')[0]}`;

const isSameSegment = (segment: Segment.Segment, payload: SegmentPayload): boolean => {
  const kind = payload.kind ?? 'flight';
  // Only transport variants (flight/train) carry a `number`; match like-for-like kinds.
  const details = segment.details;
  if (details._tag !== kind) {
    return false;
  }
  const number = details._tag === 'flight' || details._tag === 'train' ? details.number : undefined;
  const departAt = Segment.getDepartAt(segment);
  if (!number || !departAt || !payload.number || !payload.departAt) {
    return false;
  }

  return matchKey(number, departAt) === matchKey(payload.number, payload.departAt);
};

const findExistingSegment = (
  db: Database.Database,
  payload: SegmentPayload,
): Effect.Effect<Segment.Segment | undefined> => {
  if (!payload.number || !payload.departAt) {
    return Effect.succeed(undefined);
  }
  return Effect.promise(() => db.query(Filter.type(Segment.Segment)).run()).pipe(
    Effect.map((segments) => segments.find((segment) => isSameSegment(segment, payload))),
    // Recover (e.g. Segment type not registered, db closed) to undefined rather than letting an
    // unhandled rejection bubble through the operation handler.
    Effect.catchAllDefect(() => Effect.succeed(undefined)),
  );
};

/**
 * Normalise a confirmation code (PNR) for comparison. Airline record locators are case-insensitive
 * alphanumerics; an LLM pass over a second email may return the same code with different casing or
 * stray whitespace (e.g. "abc 123" vs "ABC123"). Comparing the normalised form keeps two emails for
 * one booking on a single Trip instead of spawning a duplicate.
 */
const normalizeConfirmationCode = (code: string): string => code.replace(/\s+/g, '').toUpperCase();

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
  const normalized = normalizeConfirmationCode(confirmationCode);
  return Effect.promise(() => db.query(Filter.type(Booking.Booking)).run()).pipe(
    Effect.map((bookings) =>
      bookings.find(
        (booking) =>
          booking.confirmationCode !== undefined && normalizeConfirmationCode(booking.confirmationCode) === normalized,
      ),
    ),
    Effect.catchAllDefect(() => Effect.succeed(undefined)),
  );
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse an ISO timestamp to epoch millis; undefined if missing or invalid. */
const epoch = (iso?: string): number | undefined => {
  if (!iso) {
    return undefined;
  }
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? undefined : ms;
};

/**
 * Find the nearest existing Trip whose date range is within `gapDays` of this segment's departure —
 * i.e. the segment falls inside `[start - gap, end + gap]`. Used to group separately-booked legs of
 * one journey (different PNRs) into a single Trip. A `gapDays` of 0 still allows same-day joins.
 */
const findTripWithinGap = (
  db: Database.Database,
  payload: SegmentPayload,
  gapDays: number,
): Effect.Effect<Trip.Trip | undefined> => {
  const at = epoch(payload.departAt);
  if (at === undefined) {
    return Effect.succeed(undefined);
  }
  const gapMs = Math.max(0, gapDays) * MS_PER_DAY;
  return Effect.promise(() => db.query(Filter.type(Trip.Trip)).run()).pipe(
    Effect.map((trips) => {
      let best: Trip.Trip | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const trip of trips) {
        const start = epoch(trip.start);
        if (start === undefined) {
          continue;
        }
        const end = epoch(trip.end) ?? start;
        if (at < start - gapMs || at > end + gapMs) {
          continue;
        }
        const distance = at < start ? start - at : at > end ? at - end : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = trip;
        }
      }
      return best;
    }),
    Effect.catchAllDefect(() => Effect.succeed(undefined)),
  );
};

const tripNameFor = (payload: SegmentPayload): string => {
  const origin = payload.origin?.code ?? payload.origin?.name ?? '?';
  const destination = payload.destination?.code ?? payload.destination?.name ?? '?';
  const number = payload.number ?? '';
  return number ? `${origin} → ${destination} (${number})` : `${origin} → ${destination}`;
};

const makeSegment = (
  payload: SegmentPayload,
  provider: Provider.Provider,
  booking: Booking.Booking,
): Segment.Segment => {
  // Fields shared by all transport variants (TransportFields).
  const transport = {
    origin: payload.origin,
    destination: payload.destination,
    departAt: payload.departAt,
    arriveAt: payload.arriveAt,
    number: payload.number,
    provider,
    seat: payload.seat,
  };
  const details: Segment.Details =
    (payload.kind ?? 'flight') === 'train'
      ? { _tag: 'train', ...transport, platform: payload.platform, coach: payload.coach }
      : { _tag: 'flight', ...transport, gateFrom: payload.gateFrom, terminalFrom: payload.terminalFrom };
  return Segment.make({ booking: Ref.make(booking), details });
};

/** Widen a Trip's date range to cover a newly-appended segment (ISO timestamps compare lexically). */
const widenTripRange = (trip: Trip.Trip, payload: SegmentPayload): void => {
  Obj.update(trip, (trip) => {
    if (payload.departAt && (!trip.start || payload.departAt < trip.start)) {
      trip.start = payload.departAt;
    }
    if (payload.arriveAt && (!trip.end || payload.arriveAt > trip.end)) {
      trip.end = payload.arriveAt;
    }
  });
};

/**
 * Update an existing segment in place from a re-extracted leg (gate/terminal/platform changes, or a
 * follow-up email filling in missing fields).
 */
const updateExistingSegment = (segment: Segment.Segment, payload: SegmentPayload): void => {
  Obj.update(segment, (segment) => {
    const details = segment.details;
    // Common transport fields (flight + train).
    if (details._tag === 'flight' || details._tag === 'train') {
      if (payload.origin !== undefined) {
        details.origin = payload.origin;
      }
      if (payload.destination !== undefined) {
        details.destination = payload.destination;
      }
      // Same-day schedule changes share the (number, depart-date) key, so refresh the times too.
      if (payload.departAt !== undefined) {
        details.departAt = payload.departAt;
      }
      if (payload.arriveAt !== undefined) {
        details.arriveAt = payload.arriveAt;
      }
      if (payload.seat !== undefined) {
        details.seat = payload.seat;
      }
    }
    if (details._tag === 'flight') {
      if (payload.gateFrom !== undefined) {
        details.gateFrom = payload.gateFrom;
      }
      if (payload.terminalFrom !== undefined) {
        details.terminalFrom = payload.terminalFrom;
      }
    } else if (details._tag === 'train') {
      if (payload.platform !== undefined) {
        details.platform = payload.platform;
      }
      if (payload.coach !== undefined) {
        details.coach = payload.coach;
      }
    }
  });
};

/**
 * Assemble ALL legs of one booking into the object graph. Every segment shares the booking's PNR, so
 * they attach to a single Trip + Booking, resolved once:
 *  - an existing Booking with the same PNR → its Trip;
 *  - else a Trip within the configured date gap (gap-join) → a new Booking parented to it;
 *  - else a brand-new Trip + Booking.
 * Each segment that already exists (same kind/number/depart-date) is updated in place; the rest are
 * created and appended. Only the Trip is top-level, so the source message links to the Trip alone.
 */
const assemble = (
  payload: ExtractionPayload,
  { db, source }: { db: Database.Database; source: Obj.Any; template: ExtractionTemplate },
): Effect.Effect<ExtractResult> =>
  Effect.gen(function* () {
    const message = source as Message.Message;
    // A segment is only useful with an identity (number + depart time).
    const segments = (payload.segments ?? []).filter((segment) => !!segment.number && !!segment.departAt);
    if (segments.length === 0) {
      return { created: [], updated: [], relations: [] };
    }

    const created: Obj.Any[] = [];
    const updated = new Map<string, Obj.Any>();

    // First pass: update legs that already exist; collect the genuinely new ones. Doing this before
    // resolving a Booking means a pure update (e.g. a gate-change email) creates nothing new.
    const toCreate: SegmentPayload[] = [];
    for (const segment of segments) {
      const existing = yield* findExistingSegment(db, segment);
      if (existing) {
        updateExistingSegment(existing, segment);
        updated.set(existing.id, existing);
        const owningTrip = Obj.getParent(existing);
        if (Trip.instanceOf(owningTrip)) {
          // A schedule change can move the leg's times; widen the trip to cover the new bounds.
          widenTripRange(owningTrip, segment);
          updated.set(owningTrip.id, owningTrip);
        }
      } else {
        toCreate.push(segment);
      }
    }

    if (toCreate.length > 0) {
      // Earliest new leg anchors the Trip's start and the gap-join lookup.
      const earliest = toCreate.reduce((a, b) =>
        (epoch(a.departAt) ?? Infinity) <= (epoch(b.departAt) ?? Infinity) ? a : b,
      );
      const provider = yield* resolveProvider(db, earliest, message);

      // Resolve the Trip + Booking that the new legs attach to: existing PNR → its Trip; else a Trip
      // within the configured gap (new Booking parented to it); else a brand-new Trip + Booking.
      let trip: Trip.Trip;
      let booking: Booking.Booking;
      const existingBooking = yield* findExistingBookingByConfirmation(db, payload.confirmationCode);
      const existingTrip = existingBooking ? Obj.getParent(existingBooking) : undefined;
      if (existingBooking && Trip.instanceOf(existingTrip)) {
        trip = existingTrip;
        booking = existingBooking;
        updated.set(trip.id, trip);
      } else {
        const nearbyTrip = yield* findTripWithinGap(db, earliest, getTripGapDays());
        if (nearbyTrip) {
          trip = nearbyTrip;
          updated.set(trip.id, trip);
        } else {
          // Push the Trip BEFORE the Booking so the parent is persisted first — otherwise the
          // dispatcher adds the Booking while its parent is absent and gives it a provenance chip.
          trip = Trip.make({ name: tripNameFor(earliest), start: earliest.departAt, end: earliest.arriveAt });
          created.push(trip);
        }
        booking = Booking.make({
          provider,
          confirmationCode: payload.confirmationCode,
          source: 'email',
          rawPayload: getBodyText(message),
        });
        // Anchor the Booking under the Trip so the dispatcher treats it as a child (no provenance chip).
        Obj.setParent(booking, trip);
        created.push(booking);
      }

      for (const segment of toCreate) {
        const segmentProvider = yield* resolveProvider(db, segment, message);
        const newSegment = makeSegment(segment, segmentProvider, booking);
        Trip.addSegment(trip, newSegment);
        widenTripRange(trip, segment);
        created.push(newSegment);
      }
    }

    return { created, updated: Array.from(updated.values()), relations: [] };
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
  payload: SegmentPayload,
  message: Message.Message,
): Effect.Effect<Provider.Provider, never> =>
  Effect.gen(function* () {
    const domain = payload.provider?.domain ?? senderDomain(message);
    // The IATA airline-prefix lookup only makes sense for flights; rail operators carry their own
    // name in the payload (or fall back to the sender domain).
    const code = (payload.kind ?? 'flight') === 'flight' ? airlineCodeOf(payload.number) : undefined;
    const name =
      payload.provider?.name ??
      (code && AIRLINES.find((airline) => airline.code === code)?.name) ??
      (domain ? domainToName(domain) : undefined);
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
  kinds: ['flight', 'train'],
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
  payloadSchema: ExtractionPayload,
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
