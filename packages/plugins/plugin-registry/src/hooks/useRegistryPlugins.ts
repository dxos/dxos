//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';

import { type Registry } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/ui';

/**
 * Reads the registry plugin catalog from `manager.pluginRegistry.plugins`.
 * The catalog is loaded once when the plugin manager is constructed (with a
 * provider) so this hook is purely reactive — subscribers re-render as the
 * `{entries, loading, error}` state settles.
 */
export const useRegistryPlugins = (): Registry.PluginsState => {
  const manager = usePluginManager();
  return useAtomValue(manager.pluginRegistry.plugins);
};

/**
 * Returns the live `Registry.Manager` from the plugin manager so callers can
 * issue `listVersions` / `getPlugin` calls directly. The catalog state itself
 * is best read through {@link useRegistryPlugins} above.
 */
export const useRegistryPluginProvider = (): Registry.Manager => {
  const manager = usePluginManager();
  return manager.pluginRegistry;
};
