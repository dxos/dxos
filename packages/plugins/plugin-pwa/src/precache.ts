//
// Copyright 2023 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Predicate from 'effect/Predicate';

// Every 15 minutes rather than hourly. A check is one conditional request for the worker script, and
// finding an update sooner costs nothing extra: the install happens once per deployed version either
// way. An hour was long enough to leave a tab a full release behind.
export const UPDATE_CHECK_INTERVAL = Duration.minutes(15);

/**
 * Progress envelope posted by the host's service worker while it precaches a build. The contract is
 * duplicated in `composer-app/src/sw.ts` so the worker bundle stays free of host code - keep in sync.
 */
export const PRECACHE_PROGRESS = 'dxos:precache-progress';

export type PrecacheProgress = {
  type: typeof PRECACHE_PROGRESS;
  current: number;
  total: number;
  isUpdate: boolean;
  done: boolean;
};

export const isPrecacheProgress = (data: unknown): data is PrecacheProgress =>
  Predicate.isObject(data) && data.type === PRECACHE_PROGRESS;
