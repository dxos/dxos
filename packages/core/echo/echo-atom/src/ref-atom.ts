//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type Entity, Obj, type Ref } from '@dxos/echo';
import { getSnapshot } from '@dxos/live-object';

/**
 * Create a read-only atom for a reference target.
 * Returns undefined if the reference is undefined or hasn't loaded yet.
 * Automatically updates when the target loads or changes.
 * The atom handles async loading internally and subscribes to target object changes.
 */
export function make<T extends Entity.Unknown>(ref: Ref.Ref<T> | undefined): Atom.Atom<T | undefined> {
  if (!ref) {
    return Atom.make<T | undefined>(() => undefined);
  }

  return Atom.make<T | undefined>((get) => {
    let unsubscribeTarget: (() => void) | undefined;

    const setupTargetSubscription = (target: T) => {
      unsubscribeTarget?.();
      unsubscribeTarget = Obj.subscribe(target, () => {
        get.setSelf(getSnapshot(target) as T);
      });
    };

    get.addFinalizer(() => unsubscribeTarget?.());

    const currentTarget = ref.target;
    if (currentTarget) {
      setupTargetSubscription(currentTarget);
      return getSnapshot(currentTarget) as T;
    }

    // Target not loaded yet - trigger async load.
    void ref
      .load()
      .then((loadedTarget) => {
        setupTargetSubscription(loadedTarget);
        get.setSelf(getSnapshot(loadedTarget) as T);
      })
      .catch(() => {
        // Loading failed, keep target as undefined.
      });

    return undefined;
  });
}
