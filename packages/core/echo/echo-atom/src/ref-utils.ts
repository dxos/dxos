//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';

import type { Ref } from '@dxos/echo';

/**
 * Internal helper for loading ref targets in atoms.
 * Handles the common pattern of checking for loaded target and triggering async load.
 *
 * @param ref - The ref to load.
 * @param get - The atom context for setSelf.
 * @param onTargetAvailable - Callback invoked when target is available (sync or async).
 *   Should return the value to use for the atom.
 * @returns The result of onTargetAvailable if target is already loaded, undefined otherwise.
 */
export const loadRefTarget = <T, R>(
  ref: Ref.Ref<T>,
  get: Atom.Context,
  onTargetAvailable: (target: T) => R,
): R | undefined => {
  // Accessing `ref.target` registers a resolution callback when the target is
  // not yet loaded, so resolution can be observed via `ref.onResolved` below.
  const currentTarget = ref.target;
  if (currentTarget) {
    return onTargetAvailable(currentTarget);
  }

  // Subscribe to the ref's resolution event in case the target loads later
  // (e.g. when a sibling client creates the linked object). Without this,
  // a one-shot async load that fails because the document hasn't propagated
  // would leave the atom permanently undefined.
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
      // Loading failed; the resolution subscription above will pick up
      // cross-client updates when they arrive.
    });

  return undefined;
};
