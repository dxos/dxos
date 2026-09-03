//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import { useRegistry } from '../registry.ts';

/**
 * Hook to initialize atoms with values
 */
export function useAtomInitialValues(initialValues: Iterable<readonly [Atom.Writable<any, any>, any]>): void {
  const registry = useRegistry();

  for (const [atom, value] of initialValues) {
    registry.set(atom, value);
  }
}
