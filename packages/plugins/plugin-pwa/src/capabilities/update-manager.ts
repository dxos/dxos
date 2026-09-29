//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';

/** The part of `ServiceWorkerRegistration` the manager reads, so it can be driven without a browser. */
export type RegistrationLike = {
  /** Only awaited; the resolved value is not read. */
  update: () => Promise<unknown>;
  readonly installing: unknown;
  readonly waiting: unknown;
};

export type UpdateManagerOptions = {
  status: Atom.Writable<AppUpdate.Status>;
  setStatus: (status: AppUpdate.Status) => void;
  supported: boolean;
  /** Served by the vite dev server, whose `registerSW` stub never registers a worker. */
  dev: boolean;
  /** Resolves once the worker registers; `undefined` when registration failed. */
  registration: Promise<RegistrationLike | undefined>;
  /** Where `controllerchange` fires once the waiting worker takes over. */
  container: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  /** Tells the waiting worker to activate. */
  skipWaiting: () => Promise<void>;
  reload: () => void;
};

/** The status a precache progress message from an updating worker implies. */
export const progressStatus = ({
  current,
  total,
  done,
}: {
  current: number;
  total: number;
  done: boolean;
}): AppUpdate.Status =>
  // `done` is posted when the new worker reaches `installed`, i.e. once it is waiting.
  done ? { kind: 'ready' } : { kind: 'downloading', progress: { completed: current, total, unit: 'entries' } };

/**
 * The web's update manager. There is no `install`: `update()` has the browser install the new worker as
 * part of checking, so progress and completion arrive from the worker, not from this call.
 */
export const makeUpdateManager = ({
  status,
  setStatus,
  supported,
  dev,
  registration: whenRegistered,
  container,
  skipWaiting,
  reload,
}: UpdateManagerOptions): AppUpdate.Manager => {
  return {
    status,
    check: async () => {
      if (!supported) {
        setStatus({ kind: 'unsupported' });
        return;
      }
      if (dev) {
        setStatus({ kind: 'dev' });
        return;
      }
      // Registration waits for the window `load` event, so an early click waits with it.
      const registration = await whenRegistered;
      if (!registration) {
        return;
      }
      // Staged already: `ready` still holds.
      if (registration.waiting) {
        setStatus({ kind: 'ready' });
        return;
      }
      // In flight already: its progress drives the status, and another `update()` would only race it.
      if (registration.installing) {
        return;
      }
      setStatus({ kind: 'checking' });
      try {
        await registration.update();
      } catch (error) {
        setStatus({ kind: 'failed', error: error instanceof Error ? error.message : String(error) });
        return;
      }
      if (!registration.installing && !registration.waiting) {
        setStatus({ kind: 'up-to-date', checkedAt: Date.now() });
      }
    },
    apply: async () => {
      // vite-plugin-pwa reloads only a tab that was already controlled when it registered.
      const onControllerChange = () => reload();
      container.addEventListener('controllerchange', onControllerChange, { once: true });
      try {
        await skipWaiting();
      } catch (error) {
        container.removeEventListener('controllerchange', onControllerChange);
        throw error;
      }
    },
  };
};
