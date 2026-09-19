//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';

import { usePluginManager } from '@dxos/app-framework/ui';

import { SettingsOperation } from '../../operations/index.ts';

/**
 * Whether this build exposes the plugin registry. A curated build (`DX_PLUGIN_SET=production`)
 * withholds the plugin, so anything offering to open the registry has to hide itself instead of
 * dispatching an operation whose destination does not exist.
 */
export const usePluginRegistryAvailable = (): boolean => {
  const manager = usePluginManager();
  const enabled = useAtomValue(manager.enabled);
  return SettingsOperation.isPluginRegistryAvailable(enabled);
};
