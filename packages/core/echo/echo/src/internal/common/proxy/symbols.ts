//
// Copyright 2024 DXOS.org
//

// TODO(dmaretskyi): Rename all symbols that are props to end with *Key.
export const EventId = Symbol.for('@dxos/live-object/EventId');

/**
 * Subscription channel for `latestOnly` subscribers. Fired only on real data changes (local writes,
 * remote sync), never on time-travel scrubbing, so side-effecting subscribers stay insulated from
 * historical values. Parallel to {@link EventId} (the default/display channel).
 */
export const LatestEventId = Symbol.for('@dxos/live-object/LatestEventId');

export const ChangeId = Symbol.for('@dxos/live-object/ChangeId');
