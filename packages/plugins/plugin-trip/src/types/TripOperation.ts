//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

import * as Segment from './Segment.ts';
import * as Trip from './Trip.ts';

/**
 * Trip-message extractor as a first-class operation. The handler at
 * `operations/extractor/trip-extractor.ts` parses flight-confirmation emails into Booking
 * + flight Segment proposals and returns them via `ExtractResult` WITHOUT touching the
 * database — the dispatcher (`InboxOperation.ExtractMessage`) is the single point where
 * `db.add` happens. Keeping persistence in the dispatcher lets a future preview/edit/cancel
 * UI interpose between extraction and commit.
 */
export const ExtractTrip = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.trip.extract'),
    name: 'Extract Trip',
    description: 'Parse a flight confirmation email into Booking + Segment proposals.',
    icon: 'ph--airplane-takeoff--regular',
  },
  services: [Capability.Service, AiService.AiService],
  input: InboxOperation.ExtractInputSchema,
  output: InboxOperation.ExtractResultSchema,
});

/**
 * Merge a Trip into the nearest other Trip whose date range is within the configured grouping gap
 * (see plugin Settings, default 28 days): move this Trip's Segments and Bookings onto the target
 * Trip, widen the target's date range, and delete this Trip. A no-op (`merged: false`) when no Trip
 * lies within the gap.
 */
export const MergeTrip = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.trip.merge'),
    name: 'Merge trip',
    description: 'Merge this trip into the nearest other trip by date and delete it.',
    icon: 'ph--arrows-merge--regular',
  },
  // The Trip is passed as the live ECHO object (validated/narrowed in the handler).
  input: Schema.Struct({ trip: Schema.Any }),
  output: Schema.Struct({
    merged: Schema.Boolean,
    targetTripId: Schema.optional(Schema.String),
  }),
});

/**
 * Build a new Trip + itinerary from a set of calendar Events. Each Event that has a `location`
 * becomes an `activity` Segment at that address; events without a location are skipped. The Trip is
 * persisted to the calendar's space, the user is navigated to it, and the trip-planning skill is
 * run in the background to fill in connecting travel and accommodation. The Calendar and Events are
 * passed as live ECHO objects (validated/narrowed in the handler).
 */
export const CreateTripFromEvents = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.trip.createFromEvents'),
    name: 'Create trip from events',
    description: 'Create a new trip and itinerary from a range of calendar events.',
    icon: 'ph--airplane-takeoff--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    calendar: Schema.Any,
    events: Schema.Array(Schema.Any),
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({ trip: Type.getSchema(Trip.Trip) }),
});

/**
 * Add a single Segment to a Trip. Exposed to the trip-planning skill so the agent can build out
 * an itinerary (connecting travel, accommodation) around the fixed activity stops.
 */
export const AddSegment = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.trip.addSegment'),
    name: 'Add segment',
    description: 'Add a travel segment (flight, train, boat, road, accommodation, activity) to a trip.',
    icon: 'ph--plus--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    trip: Ref.Ref(Trip.Trip).annotate({ description: 'The trip to add the segment to.' }),
    kind: Segment.Kind.annotate({
      description: 'Segment kind: flight, train, boat, road, accommodation, or activity.',
    }),
    title: Schema.optional(Schema.String).annotate({
      description: 'Title or name (activity title, hotel name, etc.).',
    }),
    origin: Schema.optional(Schema.String).annotate({
      description: 'Origin place name for transport segments, or the location for accommodation/activity.',
    }),
    destination: Schema.optional(Schema.String).annotate({
      description: 'Destination place name for transport segments.',
    }),
    departAt: Schema.optional(Schema.String).annotate({
      description: 'Start / departure / check-in time (ISO 8601).',
    }),
    arriveAt: Schema.optional(Schema.String).annotate({
      description: 'End / arrival / check-out time (ISO 8601).',
    }),
    notes: Schema.optional(Schema.String).annotate({ description: 'Freeform notes.' }),
  }),
  output: Schema.Struct({ segmentId: Schema.String }),
});
