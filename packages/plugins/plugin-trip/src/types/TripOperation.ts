//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { MessageExtractor } from '@dxos/plugin-inbox';

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
  services: [Capability.Service],
  input: MessageExtractor.ExtractInput,
  output: MessageExtractor.ExtractResult,
});
