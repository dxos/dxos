//
// Copyright 2025 DXOS.org
//

/**
 * Ambient "latest-read" context.
 *
 * While active, reactive reads on a time-traveling object resolve the latest committed value
 * instead of the historical view. Used to compute the value of `latestOnly` subscriptions and
 * atoms so that side-effecting subscribers never observe historical (scrubbed) data.
 *
 * Implemented as a re-entrant depth counter rather than a singleton key (see {@link isInChangeContext})
 * because a latest-read recompute may nest reads of child objects.
 */

let latestReadDepth = 0;

/**
 * Execute a callback with latest-read mode active; reads bypass any active time-travel view.
 */
export const withLatestRead = <T>(fn: () => T): T => {
  latestReadDepth++;
  try {
    return fn();
  } finally {
    latestReadDepth--;
  }
};

/**
 * @returns `true` if reads are currently forced to the latest committed value.
 */
export const isReadingLatest = (): boolean => latestReadDepth > 0;
