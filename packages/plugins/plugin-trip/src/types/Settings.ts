//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DEFAULT_PLANNING_WINDOW_DAYS, DEFAULT_TRIP_GAP_DAYS } from '../operations/extractor/config';

/**
 * Plugin settings for the Trip extractor.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    tripGapDays: Schema.optional(
      Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)).annotations({
        title: 'Trip grouping gap (days)',
        description: `Group separately-booked segments into one trip when they fall within this many days of each other. Default ${DEFAULT_TRIP_GAP_DAYS}.`,
      }),
    ),
    tripPlanningWindowDays: Schema.optional(
      Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)).annotations({
        title: 'Planning window (days)',
        description: `When planning a trip from a calendar with no selected range, include events this many days ahead from today. Default ${DEFAULT_PLANNING_WINDOW_DAYS}.`,
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
