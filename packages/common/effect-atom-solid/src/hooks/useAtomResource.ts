//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import type * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import { type Accessor, createMemo, createSignal, onCleanup } from 'solid-js';

import { useRegistry } from '../registry.ts';

/**
 * Resource-like hook for atoms that contain Result values
 * Automatically handles loading and error states
 */
export function useAtomResource<A, E>(
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
): {
  value: Accessor<A | undefined>;
  error: Accessor<E | undefined>;
  loading: Accessor<boolean>;
  result: Accessor<AsyncResult.AsyncResult<A, E>>;
} {
  const registry = useRegistry();
  const [result, setResult] = createSignal<AsyncResult.AsyncResult<A, E>>(registry.get(atom));

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
