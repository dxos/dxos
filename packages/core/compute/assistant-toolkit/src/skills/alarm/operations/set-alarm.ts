//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';

import { SetAlarm } from './definitions';
import { resolveWakeAt } from './resolve-wake-at';

/**
 * Schedules a self-wake on the owning host via {@link Harness.setAlarm}. The host delivers the
 * (optional) reminder message when the alarm fires.
 */
export default SetAlarm.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ in: inDuration, at, message }) {
      const now = yield* Clock.currentTimeMillis;
      const resolved = resolveWakeAt({ in: inDuration, at }, now);
      if (Either.isLeft(resolved)) {
        return resolved.left;
      }
      const wakeAt = DateTime.unsafeMake(resolved.right);
      yield* Harness.setAlarm({ at: wakeAt, message: message ?? null });
      return `Alarm scheduled to wake you at ${new Date(resolved.right).toISOString()}.`;
    }),
  ),
);
