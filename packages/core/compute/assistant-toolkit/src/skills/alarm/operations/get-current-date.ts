//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { GetCurrentDate } from './definitions';

/**
 * Reports the current time from the ambient Effect clock as an ISO-8601 string, so it stays
 * consistent with alarm scheduling (and honors a TestClock under tests).
 */
export default GetCurrentDate.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const now = yield* Clock.currentTimeMillis;
      return new Date(now).toISOString();
    }),
  ),
);
