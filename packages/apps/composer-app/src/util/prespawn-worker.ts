//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/** Tab → dedicated worker: the tab holds the leader lock, so the worker may join the storage lock. */
const START_MESSAGE = { type: 'dxos:start-worker' } as const;

/**
 * A dedicated worker started before the client exists, so its script loads and evaluates while
 * the page is still importing and configuring.
 */
export type PrespawnedWorker = {
  /** Hands the worker over once, started; returns `undefined` when it was never spawned or already taken. */
  take: () => Worker | undefined;
  /** Terminates the worker if nothing took it. */
  dispose: () => void;
};

/**
 * Lets a dedicated worker run its storage-lock loop; every worker the tab hands to the leader session
 * goes through here, since the worker script waits for it (see {@link onWorkerStart}).
 */
export const startWorker = (worker: Worker): Worker => {
  worker.postMessage(START_MESSAGE);
  return worker;
};

/**
 * Worker side of {@link startWorker}: runs `start` once the tab sends the start message.
 *
 * A started worker displaces whichever worker holds the storage lock, so a worker that runs before its
 * tab is elected tears down the elected leader's worker and leaves that leader waiting out its whole
 * handshake budget. Registered synchronously at evaluation, so a message the tab posted while the
 * script was loading is not dropped.
 */
export const onWorkerStart = (start: () => void): void => {
  const listener = (event: MessageEvent) => {
    if (event.data?.type !== START_MESSAGE.type) {
      return;
    }
    self.removeEventListener('message', listener);
    start();
  };
  self.addEventListener('message', listener);
};

/**
 * Spawns `create()` only when no tab holds `leaderLockKey`, since a worker beside a live leader would
 * never be taken. The check is a snapshot that another tab's election can overtake, which is why the
 * worker only loads and evaluates until {@link PrespawnedWorker.take} starts it.
 */
export const prespawnWorker = ({
  create,
  leaderLockKey,
}: {
  create: () => Worker;
  leaderLockKey: string;
}): PrespawnedWorker => {
  let state: 'checking' | 'spawned' | 'done' = 'checking';
  let worker: Worker | undefined;
  // The leader session attaches its handlers only once it takes the worker, and a worker's events
  // are dropped while it has no listener, so anything it posts before then (a load error) is held here.
  const buffered: Event[] = [];
  const buffer = (event: Event) => buffered.push(event);

  const spawn = async () => {
    const { held = [] } = await navigator.locks.query();
    if (state !== 'checking' || held.some((lock) => lock.name === leaderLockKey)) {
      state = 'done';
      return;
    }
    worker = create();
    worker.addEventListener('message', buffer);
    worker.addEventListener('error', buffer);
    state = 'spawned';
    performance.mark('worker-connection:prespawned');
  };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    void spawn().catch((err) => {
      state = 'done';
      log.warn('dedicated worker prespawn skipped', { err });
    });
  } else {
    state = 'done';
  }

  return {
    take: () => {
      const taken = state === 'spawned' ? worker : undefined;
      state = 'done';
      if (!taken) {
        return undefined;
      }
      taken.removeEventListener('message', buffer);
      taken.removeEventListener('error', buffer);
      // Replayed after the caller's synchronous handler setup, and before any later message task.
      queueMicrotask(() => buffered.splice(0).forEach((event) => taken.dispatchEvent(event)));
      return startWorker(taken);
    },
    dispose: () => {
      if (state === 'spawned') {
        worker?.terminate();
      }
      state = 'done';
      buffered.length = 0;
    },
  };
};
