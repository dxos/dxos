//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import type * as Result from '@effect-atom/atom/Result';
import * as Cause from 'effect/Cause';
import { type Accessor, createMemo, createSignal, onCleanup } from 'solid-js';

import { useRegistry } from '../registry';

/**
 * Resource-like hook for atoms that contain Result values
 * Automatically handles loading and error states
 */
export function useAtomResource<A, E>(
  atom: Atom.Atom<Result.Result<A, E>>,
): {
  value: Accessor<A | undefined>;
  error: Accessor<E | undefined>;
  loading: Accessor<boolean>;
  result: Accessor<Result.Result<A, E>>;
} {
  const registry = useRegistry();
  const [result, setResult] = createSignal<Result.Result<A, E>>(registry.get(atom));

  const unsubscribe = registry.subscribe(
    atom,
    (nextValue) => {
      setResult(() => nextValue);
    },
    { immediate: true },
  );

  onCleanup(unsubscribe);

  const value = createMemo(() => {
    const r = result();
    return r._tag === 'Success' ? r.value : undefined;
  });

  const error = createMemo(() => {
    const r = result();
    return r._tag === 'Failure' ? (Cause.squash(r.cause) as E) : undefined;
  });

  const loading = createMemo(() => {
    const r = result();
    return r._tag === 'Initial' || r.waiting;
  });

  return {
    value,
    error,
    loading,
    result,
  };
}
