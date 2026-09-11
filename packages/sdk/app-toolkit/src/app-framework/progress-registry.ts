//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { Progress } from '@dxos/progress';

import * as AppCapabilities from './AppCapabilities.ts';

/**
 * Builds the {@link AppCapabilities.ProgressRegistry} capability value over an atom {@link Registry.AtomRegistry}. A
 * shared `@dxos/progress` core drives an in-memory snapshot; every mutation is mirrored into a
 * kept-alive writable atom (so a background producer can populate it before any surface subscribes),
 * and per-provider atoms are derived selectors memoized by name.
 */
export const createProgressRegistry = (registry: Registry.AtomRegistry): AppCapabilities.ProgressRegistry => {
  const core = Progress.make();
  const snapshotAtom = Atom.make<Progress.ProgressSnapshot>(core.snapshot()).pipe(Atom.keepAlive);
  core.subscribe((snapshot) => registry.set(snapshotAtom, snapshot));

  const monitorAtoms = new Map<string, Atom.Atom<Progress.TaskProgress | undefined>>();
  const monitorAtom = (name: string): Atom.Atom<Progress.TaskProgress | undefined> => {
    const existing = monitorAtoms.get(name);
    if (existing) {
      return existing;
    }
    const derived = Atom.map(snapshotAtom, (snapshot) => snapshot.tasks.find((task) => task.name === name));
    monitorAtoms.set(name, derived);
    return derived;
  };

  // App-registry monitors are transient per-run, not resumable like a pipeline's task list. Drop any
  // prior entry for this name first so a re-register (e.g. a retry after a failed sync) starts fresh —
  // otherwise the stale `current`/`startedAt`/`error` would carry into the new run.
  const handles = new Map<string, Progress.TaskHandle>();
  const register: AppCapabilities.ProgressRegistry['register'] = (name, options) => {
    handles.get(name)?.remove();
    const handle = core.task(name, options);
    handles.set(name, handle);
    return handle;
  };

  return {
    snapshotAtom,
    monitorAtom,
    register,
    cancel: (name) => core.cancel(name),
    snapshot: () => registry.get(snapshotAtom),
  };
};
