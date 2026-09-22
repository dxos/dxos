//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import { useContext, useLayoutEffect } from 'react';

/**
 * Keeps `atom` alive in the registry for exactly as long as the calling component is mounted.
 *
 * The revocable form of `Atom.keepAlive`, which a registry never drops: a per-mount atom made
 * keep-alive stays pinned after its component is gone.
 */
export const useAtomMount = (atom: Atom.Atom<any>): void => {
  const registry = useContext(RegistryContext);
  useLayoutEffect(() => registry.mount(atom), [registry, atom]);
};
