//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { type RegistryPluginProvider } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';

import { RegistryCapabilities, type RegistryPluginsState } from '#types';

const emptyAtom = Atom.make<RegistryPluginsState>({ entries: [], loading: true, error: null });

/**
 * Reads the registry plugin catalog from the registry state capability.
 * The catalog is loaded once at plugin startup so this hook is purely reactive.
 */
export const useRegistryPlugins = (): RegistryPluginsState => {
  const atoms = useCapabilities(RegistryCapabilities.State);
  return useAtomValue(atoms[0] ?? emptyAtom);
};

/**
 * Returns the RegistryPluginProvider instance for fetching versions and specific plugin entries.
 */
export const useRegistryPluginProvider = (): RegistryPluginProvider | undefined => {
  const providers = useCapabilities(RegistryCapabilities.Provider);
  return providers[0];
};
