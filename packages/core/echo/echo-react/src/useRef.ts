//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { useContext, useEffect, useRef as useReactRef, useState } from 'react';

import type { Entity, Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';

/**
 * Subscribe to a reference target object.
 * Returns undefined if the reference hasn't loaded yet, and automatically updates when the target loads or changes.
 *
 * @param ref - The reference to subscribe to.
 * @returns The current target object or undefined if not loaded.
 */
export function useRef<T extends Entity.Unknown>(ref: Ref.Ref<T> | undefined): T | undefined {
  const registry = useContext(RegistryContext);
  const [target, setTarget] = useState<T | undefined>(() => ref?.target);

  // Use refs to track loading state and cleanup without causing re-renders.
  const loadingRefId = useReactRef<string | undefined>(undefined);
  const unsubscribeRef = useReactRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!ref || !registry) {
      setTarget(undefined);
      return;
    }

    const refId = ref.dxn.toString();
    loadingRefId.current = refId;

    // Cleanup previous subscription.
    unsubscribeRef.current?.();
    unsubscribeRef.current = undefined;

    // Helper function to set up subscription for a target.
    const setupSubscription = (targetObj: T) => {
      // Double-check ref hasn't changed.
      if (loadingRefId.current !== refId) {
        return;
      }

      const atom = AtomObj.make(targetObj);
      const currentValue = AtomObj.get(registry, atom);

      // Final check before updating state.
      if (loadingRefId.current !== refId) {
        return;
      }

      setTarget(currentValue);

      // Subscribe to atom updates.
      unsubscribeRef.current = AtomObj.subscribe(
        registry,
        atom,
        () => {
          if (loadingRefId.current !== refId) {
            return;
          }
          const updatedValue = AtomObj.get(registry, atom) as T;
          setTarget(updatedValue);
        },
        { immediate: true },
      );
    };

    const currentTarget = ref.target;
    if (currentTarget) {
      // Target is immediately available.
      setupSubscription(currentTarget);
    } else {
      // Target not loaded yet - set to undefined and load asynchronously.
      setTarget(undefined);

      void ref
        .load()
        .then((loadedTarget: T) => {
          // Only update if we're still loading the same ref.
          if (loadingRefId.current === refId) {
            setupSubscription(loadedTarget);
          }
        })
        .catch(() => {
          // Loading failed, keep target as undefined.
        });
    }

    return () => {
      loadingRefId.current = undefined;
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
    };
  }, [ref, registry]);

  return target;
}
