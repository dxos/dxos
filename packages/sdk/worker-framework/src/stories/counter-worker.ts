//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { RpcTiming } from '@dxos/worker-framework';
import * as Worker from '@dxos/worker-framework/Worker';

import * as Rpc from '../internal/rpc';
import { COUNTER_LIVENESS_LOCK_KEY, COUNTER_STORAGE_LOCK_KEY } from './counter-constants';
import { CounterRpcs, TimingStatsSample, TimingStatsSnapshot } from './counter-service';

let count = 0;
const listeners = new Set<(value: number) => void>();

const notify = (): void => {
  for (const listener of listeners) {
    listener(count);
  }
};

const blockCpuSync = (durationMs: number): number => {
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    // Busy spin — intentionally blocks the worker event loop for lag demos.
  }
  return durationMs;
};

const counterHandlers = CounterRpcs.toLayer(
  Effect.succeed({
    increment: () =>
      Effect.sync(() => {
        count += 1;
        notify();
        return count;
      }),
    subscribe: () =>
      Stream.async<number, never>((emit) => {
        const listener = (value: number) => void emit.single(value);
        listeners.add(listener);
        void emit.single(count);
        return Effect.sync(() => listeners.delete(listener));
      }),
    ping: () => Effect.void,
    getTimingStats: () =>
      Effect.sync(() => {
        const snapshot = RpcTiming.getStatsSnapshot();
        return new TimingStatsSnapshot({
          maxQueueWaitMs: snapshot.maxQueueWaitMs,
          maxServiceMs: snapshot.maxServiceMs,
          samples: snapshot.samples.map(
            (sample) =>
              new TimingStatsSample({
                tag: sample.tag,
                queueWaitMs: sample.queueWaitMs,
                serviceMs: sample.serviceMs,
                at: sample.at,
              }),
          ),
        });
      }),
    blockCpu: ({ durationMs }) => Effect.sync(() => blockCpuSync(durationMs)),
  }),
);

Worker.run({
  storageLockKey: COUNTER_STORAGE_LOCK_KEY,
  createRuntime: () =>
    Effect.sync(() => {
      // Hold the liveness lock for the worker's lifetime. The leader's blocked request on this key
      // is only granted once the worker is torn down (the browser auto-releases held locks), which
      // is how the client Connection detects worker termination.
      void navigator.locks.request(COUNTER_LIVENESS_LOCK_KEY, () => new Promise<never>(() => {}));

      return {
        createSession: () =>
          Rpc.serveFromContext(CounterRpcs, counterHandlers, {
            timing: { minLogMs: 20 },
          }),
      };
    }),
});
