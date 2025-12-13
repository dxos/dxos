//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import type * as Result from '@effect-atom/atom/Result';
import { createResource, onCleanup } from 'solid-js';

import { useRegistry } from '../registry';

/**
 * Hook to read an atom value with Suspense support
 */
export function useAtomSuspense<A, E>(atom: Atom.Atom<Result.Result<A, E>>): () => A {
  const registry = useRegistry();

  const [data, { mutate, refetch }] = createResource(async () => {
    // Check if we already have a value
    const current = registry.get(atom);
    if (current._tag === 'Success') {
      return current.value;
    }
    if (current._tag === 'Failure') {
      throw current.cause;
    }

    // Wait for the next success or failure
    return new Promise<A>((resolve, reject) => {
      const unsubscribe = registry.subscribe(atom, (next) => {
        if (next._tag === 'Success') {
          unsubscribe();
          resolve(next.value);
        } else if (next._tag === 'Failure') {
          unsubscribe();
          reject(next.cause);
        }
      });
      // Note: We might want to handle cancellation if the resource is disposed?
      // But creating a promise that leaks isn't great.
      // Ideally we tie this to the component, but the promise itself is localized.
    });
  });

  // Subscribe to updates to keep the resource fresh
  const unsubscribe = registry.subscribe(atom, (next) => {
    if (next._tag === 'Success') {
      mutate(() => next.value);
    } else if (next._tag === 'Failure') {
      // If we encounter a failure, we trigger a refetch which will hit the fetcher
      // and throw the error (reject the promise)
      // Or we could try to mutate error state?
      // createResource doesn't have a direct 'setError'.
      // Refetching is the safe bet to re-enter the promise/error flow.
      void refetch();
    } else if (next._tag === 'Initial' || (next as any).waiting) {
      // If we go back to loading, refetch to suspend
      void refetch();
    }
  });

  onCleanup(unsubscribe);

  return () => {
    const value = data();
    if (value === undefined) {
      // This case handles when the resource is loading initially
      // createResource reads undefined (or initial value) when loading if strict mode isn't on for types,
      // but wrapping it ensures we signal "read" to Suspense.
      // However, data() itself should trigger Suspense if loading.
      // We assume standard Suspense behavior.
    }
    return value as A;
  };
}
