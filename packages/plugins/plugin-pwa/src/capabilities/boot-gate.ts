//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';
import { log } from '@dxos/log';

import { PwaNamespace } from '../namespace.ts';
import { type PwaOptions, isAutoUpdateOn, settingsAtom } from '../settings-store.ts';

/** How long the loader waits on a check that has neither found an update nor ruled one out. */
export const BOOT_GATE_CHECK_BUDGET = 5_000;

/** How long a download may go without progress before the app shows on the old build. */
export const BOOT_GATE_STALL_BUDGET = 30_000;

/** How long to wait for the reload once the new worker is told to take over. */
export const BOOT_GATE_APPLY_BUDGET = 10_000;

const RELEASED: Capabilities.BootGateState = { pending: false };

export const gateStateFor = (status: AppUpdate.Status): Capabilities.BootGateState => {
  switch (status.kind) {
    case 'idle':
    case 'checking':
      return { pending: true, status: 'Checking for updates' };
    case 'downloading': {
      const { progress } = status;
      return {
        pending: true,
        status: 'Downloading update',
        progress: progress && progress.total > 0 ? progress.completed / progress.total : undefined,
      };
    }
    case 'ready':
      return { pending: true, status: 'Updating', progress: 1 };
    // `available` is native-only: there the download is a separate step this gate does not take.
    default:
      return RELEASED;
  }
};

const budgetFor = (status: AppUpdate.Status): number =>
  status.kind === 'downloading'
    ? BOOT_GATE_STALL_BUDGET
    : status.kind === 'ready'
      ? BOOT_GATE_APPLY_BUDGET
      : BOOT_GATE_CHECK_BUDGET;

/**
 * Checks once and, if that finds an update, holds the loader through its download and applies it.
 * Once released the gate stays released: a later update is left to the toast.
 */
export const followUpdate = (
  manager: Pick<AppUpdate.Manager, 'check' | 'apply'>,
  subscribe: (listener: (status: AppUpdate.Status) => void) => () => void,
  set: (state: Capabilities.BootGateState) => void,
): (() => void) => {
  let released = false;
  let applying = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;

  const release = () => {
    if (released) {
      return;
    }
    released = true;
    clearTimeout(deadline);
    unsubscribe?.();
    set(RELEASED);
  };

  const update = (status: AppUpdate.Status) => {
    if (released) {
      return;
    }
    const next = gateStateFor(status);
    if (!next.pending) {
      release();
      return;
    }
    set(next);
    clearTimeout(deadline);
    deadline = setTimeout(release, budgetFor(status));
    if (status.kind === 'ready' && !applying) {
      applying = true;
      manager.apply().catch((error) => {
        log.warn('applying update at boot failed', { error });
        release();
      });
    }
  };

  unsubscribe = subscribe(update);
  if (released) {
    unsubscribe();
  }
  manager.check().catch((error) => {
    log.warn('update check at boot failed', { error });
    release();
  });

  return () => {
    released = true;
    clearTimeout(deadline);
    unsubscribe?.();
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (options: PwaOptions) {
    const registry = yield* Capabilities.AtomRegistry;
    const manager = yield* AppCapabilities.UpdateManager;

    // With a worker but no controller this is a first visit: the install under way is the first
    // precache, not an update, and there is nothing older to replace.
    const controlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
    const enabled =
      (options.serviceWorker === false || controlled) && isAutoUpdateOn(registry.get(settingsAtom), options);

    const state = Atom.make<Capabilities.BootGateState>(enabled ? { pending: true } : RELEASED).pipe(Atom.keepAlive);
    if (enabled) {
      const cleanup = followUpdate(
        manager,
        (listener) => registry.subscribe(manager.status, listener, { immediate: true }),
        (next) => registry.set(state, next),
      );
      yield* Effect.addFinalizer(() => Effect.sync(cleanup));
    }

    return Capability.contribute(Capabilities.BootGate, { id: `${PwaNamespace.key}.auto-update`, state });
  }),
);
