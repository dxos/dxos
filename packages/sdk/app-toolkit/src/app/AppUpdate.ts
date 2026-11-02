//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { log } from '@dxos/log';

/**
 * How far along an update's download is.
 *
 * The unit differs by platform and is carried rather than assumed: a native build downloads one
 * archive and counts bytes, while the web precaches thousands of individual entries and counts those.
 * A byte total means nothing to the web path, and a percentage alone would lose the ability to say
 * "1,240 of 4,372 files".
 */
export type Progress = {
  completed: number;
  total: number;
  unit: 'bytes' | 'entries';
};

/**
 * Where an app is in the update cycle.
 *
 * The union is deliberately a superset: not every platform reaches every state. `available` in
 * particular is native-only — see {@link Manager.install}.
 */
export type Status =
  // The platform has no update channel at all: no OTA on native, no service worker registration on
  // the web (a `DX_PWA=false` build, or a browser that refuses one).
  | { kind: 'unsupported' }
  // The platform supports updates, but this build is served by a dev server.
  | { kind: 'dev' }
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date'; checkedAt: number }
  // An update exists and has NOT been downloaded yet. Only reachable where checking and downloading
  // are separate acts, i.e. where `Manager.install` is present.
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; progress?: Progress }
  // Downloaded and staged. `Manager.apply` puts it live.
  | { kind: 'ready' }
  | { kind: 'failed'; error: string };

/**
 * The update surface a platform contributes, so one settings row can drive both.
 *
 * `install` is optional because the platforms genuinely differ, and flattening that would make the
 * web lie. On native, checking and downloading are separate: you learn a version exists, then choose
 * to fetch it. On the web `registration.update()` fetches the worker and the browser installs it as
 * part of checking, so by the time anything could be reported the download has already happened —
 * offering "an update is available, download it?" would be offering a choice that is already made.
 * A platform without a separate download step omits `install` and never reports `available`; the UI
 * keys off its absence rather than a platform flag.
 */
export type Manager = {
  status: Atom.Writable<Status>;
  /** Look for an update. Where `install` is absent this also downloads it. */
  check: () => Promise<void>;
  /** Download a known-available update. Absent where checking already downloads. */
  install?: () => Promise<void>;
  /** Put a `ready` update live — relaunch on native, reload on the web. */
  apply: () => Promise<void>;
};

/** How long the loader waits for the check, counted from the gate's start and never extended. */
export const BOOT_GATE_CHECK_BUDGET = 3_000;

/** How long a download may go without progress before the app shows on the old build. */
export const BOOT_GATE_STALL_BUDGET = 30_000;

/** How long to wait for the reload or relaunch that puts a downloaded update live. */
export const BOOT_GATE_APPLY_BUDGET = 10_000;

const RELEASED: Capabilities.BootGateState = { pending: false };

const gateStateFor = (status: Status): Capabilities.BootGateState => {
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
    // `followUpdate` starts the download at once.
    case 'available':
      return { pending: true, status: 'Downloading update', progress: 0 };
    default:
      return RELEASED;
  }
};

const budgetFor = (status: Status): number | undefined =>
  status.kind === 'available' || status.kind === 'downloading'
    ? BOOT_GATE_STALL_BUDGET
    : status.kind === 'ready'
      ? BOOT_GATE_APPLY_BUDGET
      : undefined;

/**
 * Drives a boot gate: checks once and, if that finds an update, holds the loader through its download
 * and applies it. Once released it stays released; a failed check calls `onCheckFailed`.
 */
export const followUpdate = (
  manager: Pick<Manager, 'check' | 'install' | 'apply'>,
  subscribe: (listener: (status: Status) => void) => () => void,
  set: (state: Capabilities.BootGateState) => void,
  onCheckFailed: () => void = () => {},
): (() => void) => {
  let released = false;
  let found = false;
  let phase: Status['kind'] | undefined;
  let completed = -1;
  let installing = false;
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

  const update = (status: Status) => {
    if (released) {
      return;
    }
    if (status.kind === 'failed' && !found) {
      release();
      onCheckFailed();
      return;
    }
    const next = gateStateFor(status);
    if (!next.pending || (status.kind === 'available' && !manager.install)) {
      release();
      return;
    }
    set(next);
    const budget = budgetFor(status);
    const progressed = status.kind === 'downloading' && (status.progress?.completed ?? -1) > completed;
    if (budget !== undefined && (status.kind !== phase || progressed)) {
      found = true;
      phase = status.kind;
      completed = status.kind === 'downloading' ? (status.progress?.completed ?? -1) : -1;
      clearTimeout(deadline);
      deadline = setTimeout(release, budget);
    }
    if (status.kind === 'available' && manager.install && !installing) {
      installing = true;
      manager.install().catch((error) => {
        log.warn('installing update at boot failed', { error });
        release();
      });
    }
    if (status.kind === 'ready' && !applying) {
      applying = true;
      manager.apply().catch((error) => {
        log.warn('applying update at boot failed', { error });
        release();
      });
    }
  };

  deadline = setTimeout(release, BOOT_GATE_CHECK_BUDGET);
  unsubscribe = subscribe(update);
  if (released) {
    unsubscribe();
  }
  manager.check().catch((error) => {
    log.warn('update check at boot failed', { error });
    if (!released) {
      release();
      onCheckFailed();
    }
  });

  return () => {
    released = true;
    clearTimeout(deadline);
    unsubscribe?.();
  };
};

/**
 * A boot gate's state: when `enabled` and online, it holds the loader while {@link followUpdate} runs.
 * A failed check resets the status to `idle`.
 */
export const makeBootGate = (
  registry: AtomRegistry.AtomRegistry,
  manager: Manager,
  enabled: boolean,
): { state: Atom.Atom<Capabilities.BootGateState>; dispose: () => void } => {
  const active = enabled && globalThis.navigator?.onLine !== false;
  const state = Atom.make<Capabilities.BootGateState>({ pending: active }).pipe(Atom.keepAlive);
  const dispose = active
    ? followUpdate(
        manager,
        (listener) => registry.subscribe(manager.status, listener, { immediate: true }),
        (next) => registry.set(state, next),
        () => registry.set(manager.status, { kind: 'idle' }),
      )
    : () => {};
  return { state, dispose };
};
