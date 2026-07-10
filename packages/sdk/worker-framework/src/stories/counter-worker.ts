//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { log } from '@dxos/log';
import { serveRpcGroup } from '@dxos/worker-framework';
import { runWorker } from '@dxos/worker-framework/worker';

import { COUNTER_LIVENESS_LOCK_KEY, COUNTER_STORAGE_LOCK_KEY } from './counter-constants';
import { CounterRpcs } from './counter-service';

let count = 0;
const listeners = new Set<(value: number) => void>();

const notify = (): void => {
  for (const listener of listeners) {
    listener(count);
  }
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
  }),
);

log.info('worker module initializing');

runWorker({
  storageLockKey: COUNTER_STORAGE_LOCK_KEY,
  createRuntime: async () => {
    log.info('worker runtime initializing');
    return {
      livenessLockKey: COUNTER_LIVENESS_LOCK_KEY,
      createSession: async ({ appPort }) => {
        log.info('worker session initializing');
        const server = serveRpcGroup(appPort, CounterRpcs, counterHandlers);
        await server.open();
        log.info('worker session opened');
      },
    };
  },
});
