//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type Entity, Obj, type Ref } from '@dxos/echo';
import { getSnapshot } from '@dxos/live-object';

/**
 * Create an atom for a reference target that triggers re-renders on load/change.
 * Returns a snapshot for change detection; useRef accesses ref.target for the live object.
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
        // Return a new snapshot to trigger re-render via reference change.
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
