//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { InboxOperation } from '@dxos/plugin-inbox';

import { meta } from '#meta';

const TRIP_OPERATION = `${meta.id}.operation`;

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
    key: `${TRIP_OPERATION}.extract-trip`,
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
    key: `${TRIP_OPERATION}.merge-trip`,
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
