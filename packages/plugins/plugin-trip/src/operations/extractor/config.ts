//
// Copyright 2026 DXOS.org
//

/** Default maximum gap (in days) between adjacent segments for them to be grouped into one Trip. */
export const DEFAULT_TRIP_GAP_DAYS = 28;

// Process-level bridge: the plugin Settings module writes the configured gap here so the headless
// extractor (which only receives `db`, not UI capabilities) can read it. Falls back to the default
// when the Settings module is absent (e.g. cron/agent runs).
let tripGapDays = DEFAULT_TRIP_GAP_DAYS;

/** Current trip-grouping gap in days (set by the plugin Settings module; default 28). */
export const getTripGapDays = (): number => tripGapDays;

/** Update the trip-grouping gap. Called by the Settings module when the user changes it. */
export const setTripGapDays = (days: number): void => {
  tripGapDays = Number.isFinite(days) && days >= 0 ? days : DEFAULT_TRIP_GAP_DAYS;
};
