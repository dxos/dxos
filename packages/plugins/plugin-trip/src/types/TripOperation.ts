//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { AiService } from '@dxos/ai';
import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { InboxOperation } from '@dxos/plugin-inbox';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${DXN.getName(meta.id)}.operation.${name}`);

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
    key: makeKey('extractTrip'),
    name: 'Extract Trip',
    description: 'Parse a flight confirmation email into Booking + Segment proposals.',
    icon: 'ph--airplane-takeoff--regular',
  },
  services: [Capability.Service, AiService.AiService],
  input: InboxOperation.ExtractInputSchema,
  output: InboxOperation.ExtractResultSchema,
});
