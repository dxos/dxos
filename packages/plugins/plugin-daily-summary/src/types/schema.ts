//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Plugin settings stored in KVS. */
export const DailySummarySettingsSchema = Schema.mutable(
  Schema.Struct({
    /** Hour of day (0-23) to generate the summary. Default 21 (9 PM). */
    summaryHour: Schema.optional(Schema.Number),
    /** Minute of the hour. Default 0. */
    summaryMinute: Schema.optional(Schema.Number),
  }),
);

export type DailySummarySettingsProps = Schema.Schema.Type<typeof DailySummarySettingsSchema>;
