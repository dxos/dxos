//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { type CommunityPluginProvider } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';

import { RegistryCapabilities, type CommunityPluginsState } from '#types';

const emptyAtom = Atom.make<CommunityPluginsState>({ entries: [], loading: true, error: null });

/**
 * Reads the community plugin catalog from the registry state capability.
 * The catalog is loaded once at plugin startup so this hook is purely reactive.
 */
export const useCommunityPlugins = (): CommunityPluginsState => {
  const atoms = useCapabilities(RegistryCapabilities.State);
  return useAtomValue(atoms[0] ?? emptyAtom);
};

/**
 * Returns the CommunityPluginProvider instance for fetching versions and specific plugin entries.
 */
export const useCommunityPluginProvider = (): CommunityPluginProvider | undefined => {
  const providers = useCapabilities(RegistryCapabilities.Provider);
  return providers[0];
};
