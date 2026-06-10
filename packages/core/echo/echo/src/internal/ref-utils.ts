//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';

import type { Ref } from './Ref/ref';

/**
 * Internal helper for loading ref targets in atoms.
 * Handles the common pattern of checking for loaded target and triggering async load.
 */
export const loadRefTarget = <T, R>(
  ref: Ref<T>,
  get: Atom.Context,
  onTargetAvailable: (target: T) => R,
): R | undefined => {
  // Accessing `ref.target` registers a resolution callback when the target is
  // not yet loaded, so resolution can be observed via `ref.onResolved` below.
  const currentTarget = ref.target;
  if (currentTarget) {
    return onTargetAvailable(currentTarget);
  }

  // Subscribe to the ref's resolution event in case the target loads later.
  const unsubscribe = ref.onResolved(() => {
    const target = ref.target;
    if (target) {
      get.setSelf(onTargetAvailable(target));
    }
  });
  get.addFinalizer(unsubscribe);

  // Also try async load (e.g. for objects that need disk loading).
  void ref
    .load()
    .then((loadedTarget) => {
      get.setSelf(onTargetAvailable(loadedTarget));
    })
    .catch(() => {
      // Loading failed; the resolution subscription above will pick up cross-client updates.
    });

  return undefined;
};
