//
// Copyright 2025 DXOS.org
//

import { type PluginManager, PluginManagerContext } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { useWebComponentContext } from '@dxos/web-context-solid';

/**
 * Hook to access the plugin manager.
 * @returns The plugin manager.
 */
export const usePluginManager = (): PluginManager.PluginManager => {
  const manager = useWebComponentContext(PluginManagerContext);
  const value = manager();
  invariant(value, 'PluginManager not found');
  return value;
};
