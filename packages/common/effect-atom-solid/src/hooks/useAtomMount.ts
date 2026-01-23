//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import { onCleanup } from 'solid-js';

import { useRegistry } from '../registry';

/**
 * Hook to mount an atom without reading its value
 */
export function useAtomMount<A>(atom: Atom.Atom<A>): void {
  const registry = useRegistry();
  const unmount = registry.mount(atom);
  onCleanup(unmount);
}
