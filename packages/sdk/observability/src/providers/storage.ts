//
// Copyright 2025 DXOS.org
//

import { Duration, Effect, Fiber, Schedule } from 'effect';

import { type DataProvider } from '../observability';

export const provider: DataProvider = Effect.fn(function* (observability) {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const action = Effect.gen(function* () {
      const storageEstimate = yield* Effect.tryPromise(() => navigator.storage.estimate());
      storageEstimate.usage && observability.metrics.gauge('storageUsage', storageEstimate.usage);
      storageEstimate.quota && observability.metrics.gauge('storageQuota', storageEstimate.quota);
    });

    const fiber = action.pipe(Effect.repeat(Schedule.fixed(Duration.hours(1))), Effect.runFork);
    return () => Effect.runSync(Fiber.interrupt(fiber));
  }
});
