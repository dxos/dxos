//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DEFAULT_TRIP_GAP_DAYS } from '../operations/extractor/config';

/**
 * Plugin settings for the Trip extractor.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    tripGapDays: Schema.optional(
      Schema.Number.annotations({
        title: 'Trip grouping gap (days)',
        description: `Group separately-booked segments into one trip when they fall within this many days of each other. Default ${DEFAULT_TRIP_GAP_DAYS}.`,
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
