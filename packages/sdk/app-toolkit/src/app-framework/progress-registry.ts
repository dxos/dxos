//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { Progress } from '@dxos/progress';

import * as AppCapabilities from './AppCapabilities';

/**
 * Builds the {@link AppCapabilities.ProgressRegistry} capability value over an atom {@link Registry.Registry}. A
 * shared `@dxos/progress` core drives an in-memory snapshot; every mutation is mirrored into a
 * kept-alive writable atom (so a background producer can populate it before any surface subscribes),
 * and per-provider atoms are derived selectors memoized by name.
 */
export const createProgressRegistry = (registry: Registry.Registry): AppCapabilities.ProgressRegistry => {
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

  return {
    snapshotAtom,
    monitorAtom,
    register: (name, options) => core.task(name, options),
    snapshot: () => registry.get(snapshotAtom),
  };
};
