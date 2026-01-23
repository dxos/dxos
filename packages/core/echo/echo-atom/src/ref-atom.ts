//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type Entity, type Ref } from '@dxos/echo';

/**
 * Create an atom for a reference target that returns the live object when loaded.
 * This atom only updates once when the ref loads - it does not subscribe to object changes.
 * Use AtomObj.make with a ref if you need reactive snapshots.
 */
export function make<T extends Entity.Unknown>(ref: Ref.Ref<T> | undefined): Atom.Atom<T | undefined> {
  if (!ref) {
    return Atom.make<T | undefined>(() => undefined);
  }

  return Atom.make<T | undefined>((get) => {
    const currentTarget = ref.target;
    if (currentTarget) {
      return currentTarget;
    }

    // Target not loaded yet - trigger async load.
    void ref
      .load()
      .then((loadedTarget) => {
        get.setSelf(loadedTarget);
      })
      .catch(() => {
        // Loading failed, keep target as undefined.
      });

    return undefined;
  });
}
