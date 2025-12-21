//
// Copyright 2025 DXOS.org
//

import { type MaybeAccessor, access } from '@solid-primitives/utils';
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

import type { Entity, Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { useRegistry } from '@dxos/effect-atom-solid';

/**
 * Subscribe to a reference target object.
 * Returns undefined if the reference hasn't loaded yet, and automatically updates when the target loads or changes.
 *
 * TODO: Currently there's no way to subscribe to ref target changes (when the ref points to a different object).
 *       Ref.target is reactive to signals, but SolidJS doesn't track it automatically.
 *       Once there's a way to subscribe to ref.target changes, we should use that instead of only loading.
 *
 * @param ref - The reference to subscribe to (can be reactive)
 * @returns An accessor that returns the current target object or undefined if not loaded
 */
export function useRef<T extends Entity.Unknown>(ref: MaybeAccessor<Ref.Ref<T> | undefined>): Accessor<T | undefined> {
  const registry = useRegistry();

  // Store the current target in a signal
  const [target, setTarget] = createSignal<T | undefined>(undefined);

  // Memoize the ref to track changes
  const memoizedRef = createMemo(() => access(ref));

  // Subscribe to ref target changes
  createEffect(() => {
    const r = memoizedRef();
    if (!r) {
      setTarget(() => undefined);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isActive = true;
    // Track the specific ref we're loading to ignore stale promise resolutions
    let loadingRef: Ref.Ref<T> | undefined = r;

    // Helper function to set up subscription for a target (similar to useObject)
    const setupSubscription = (targetObj: T) => {
      // Double-check we're still active before setting up subscription
      if (!isActive || loadingRef !== r) {
        return;
      }

      // Clean up previous subscription
      unsubscribe?.();

      const atom = AtomObj.make(targetObj);
      const currentValue = AtomObj.get(registry, atom);

      // Final check before updating state
      if (!isActive || loadingRef !== r) {
        return;
      }

      setTarget(() => currentValue);

      // Subscribe to atom updates (same pattern as useObject)
      unsubscribe = AtomObj.subscribe(
        registry,
        atom,
        () => {
          if (!isActive) {
            return;
          }
          const updatedValue = AtomObj.get(registry, atom) as T;
          setTarget(() => updatedValue);
        },
        { immediate: true },
      );
    };

    const currentTarget = r.target;
    // If target is immediately available, set up subscription
    if (currentTarget) {
      setupSubscription(currentTarget);
    } else {
      // Target not loaded yet - set to undefined and try to load asynchronously
      setTarget(() => undefined);

      // Use load() to explicitly load it
      void r
        .load()
        .then((loadedTarget: T) => {
          // Only update if this effect is still active and we're still loading the same ref
          // Check isActive first for early exit, then verify ref hasn't changed
          if (isActive && loadingRef === r && memoizedRef() === r) {
            setupSubscription(loadedTarget);
          }
        })
        .catch(() => {
          // Loading failed, keep target as undefined
          // Only update if still active and still loading the same ref
          if (isActive && loadingRef === r) {
            setTarget(() => undefined);
          }
        });
    }

    onCleanup(() => {
      isActive = false;
      loadingRef = undefined; // Clear ref reference to ignore any pending promises
      unsubscribe?.();
    });
  });

  return target;
}
