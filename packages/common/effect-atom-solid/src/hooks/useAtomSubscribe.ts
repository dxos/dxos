//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';
import { onCleanup } from 'solid-js';

import { useRegistry } from '../registry.ts';

/**
 * Hook to subscribe to atom changes with a callback
 */
export function useAtomSubscribe<A>(
  atom: Atom.Atom<A>,
  f: (value: A) => void,
  options?: { readonly immediate?: boolean },
): void {
  const registry = useRegistry();

  const unsubscribe = registry.subscribe(atom, f, options);
  onCleanup(unsubscribe);
}
