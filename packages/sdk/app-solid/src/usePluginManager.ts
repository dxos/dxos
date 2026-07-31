//
// Copyright 2025 DXOS.org
//

import { PluginManagerContext } from '@dxos/app-framework';
import type * as PluginManager from '@dxos/app-framework/PluginManager';
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
