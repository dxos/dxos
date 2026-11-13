//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/**
 * A dedicated worker started before the client exists, so its script loads and evaluates while
 * the page is still importing and configuring.
 */
export type PrespawnedWorker = {
  /** Hands the worker over once; returns `undefined` when it was never spawned or already taken. */
  take: () => Worker | undefined;
  /** Terminates the worker if nothing took it, releasing the storage lock it queued on. */
  dispose: () => void;
};

/**
 * Spawns `create()` only when no tab holds `leaderLockKey`: the worker displaces any running
 * worker as it starts, so spawning one beside a live leader would tear down that tab's services.
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
  // are dropped while it has no listener, so the handshake's first message is held here.
  const buffered: Event[] = [];
  const buffer = (event: Event) => buffered.push(event);

  const spawn = async () => {
    const { held = [] } = await navigator.locks.query();
    if (state !== 'checking') {
      log('dedicated worker prespawn skipped: already taken or disposed', { state });
      state = 'done';
      return;
    }
    if (held.some((lock) => lock.name === leaderLockKey)) {
      log('dedicated worker prespawn skipped: another tab leads', { leaderLockKey });
      state = 'done';
      return;
    }
    worker = create();
    worker.addEventListener('message', buffer);
    worker.addEventListener('error', buffer);
    state = 'spawned';
    log('dedicated worker prespawned');
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
      if (!taken) {
        log('no prespawned dedicated worker to hand over', { state });
        state = 'done';
        return undefined;
      }
      state = 'done';
      taken.removeEventListener('message', buffer);
      taken.removeEventListener('error', buffer);
      log('handing over prespawned dedicated worker', { bufferedEvents: buffered.map((event) => event.type) });
      // Replayed after the caller's synchronous handler setup, and before any later message task.
      queueMicrotask(() =>
        buffered.splice(0).forEach((event) => {
          try {
            taken.dispatchEvent(event);
          } catch (err) {
            // A lost replay leaves the handshake waiting on a message that already arrived.
            log.warn('prespawned worker event replay failed', { type: event.type, err });
          }
        }),
      );
      return taken;
    },
    dispose: () => {
      if (state === 'spawned') {
        log('terminating unclaimed prespawned dedicated worker');
        worker?.terminate();
      }
      state = 'done';
      buffered.length = 0;
    },
  };
};
