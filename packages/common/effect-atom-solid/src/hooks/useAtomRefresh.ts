//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import { onCleanup } from 'solid-js';

import { useRegistry } from '../registry';

/**
 * Hook to get a refresh function for an atom
 */
export function useAtomRefresh<A>(atom: Atom.Atom<A>): () => void {
  const registry = useRegistry();

  const unmount = registry.mount(atom);
  onCleanup(unmount);

  return () => registry.refresh(atom);
}
