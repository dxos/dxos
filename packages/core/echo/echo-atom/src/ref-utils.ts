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
  const currentTarget = ref.target;
  if (currentTarget) {
    return onTargetAvailable(currentTarget);
  }

  // Target not loaded yet - trigger async load.
  void ref
    .load()
    .then((loadedTarget) => {
      get.setSelf(onTargetAvailable(loadedTarget));
    })
    .catch(() => {
      // Loading failed, keep target as undefined.
    });

  return undefined;
};
