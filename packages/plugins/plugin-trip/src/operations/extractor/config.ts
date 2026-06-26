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

/** Default number of days from today to include when planning a trip from a calendar with no selected range. */
export const DEFAULT_PLANNING_WINDOW_DAYS = 14;

// Process-level bridge (see `tripGapDays`): the Settings module writes the configured window here so
// the app-graph action can read it without UI capabilities. Falls back to the default when unset.
let planningWindowDays = DEFAULT_PLANNING_WINDOW_DAYS;

/** Current planning window in days (set by the plugin Settings module; default 14). */
export const getPlanningWindowDays = (): number => planningWindowDays;

/** Update the planning window. Called by the Settings module when the user changes it. */
export const setPlanningWindowDays = (days: number): void => {
  planningWindowDays = Number.isFinite(days) && days >= 1 ? days : DEFAULT_PLANNING_WINDOW_DAYS;
};
