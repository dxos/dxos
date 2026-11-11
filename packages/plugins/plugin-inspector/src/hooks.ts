//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useMemo } from 'react';

import type * as Capability from '@dxos/app-framework/Capability';
import type * as Plugin from '@dxos/app-framework/Plugin';
import { usePluginManager } from '@dxos/app-framework/PluginManagerProvider';

/** The inspected plugin, once the manager has it. */
export const useInspectedPlugin = (pluginId: string): Plugin.Plugin | undefined => {
  const manager = usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  return plugins.find((plugin) => plugin.meta.profile.key === pluginId);
};

/** What the inspected plugin's modules contribute to `interfaceDef`, by module id. */
export const useContributions = <T>(
  pluginId: string,
  interfaceDef: Capability.InterfaceDef<T>,
): readonly { moduleId: string; value: T }[] => {
  const manager = usePluginManager();
  const plugin = useInspectedPlugin(pluginId);
  const byModule = useAtomValue(manager.capabilities.atomByModule(interfaceDef));
  return useMemo(
    () =>
      (plugin?.modules ?? []).flatMap((module) =>
        (byModule[module.id] ?? []).map((value) => ({ moduleId: module.id, value })),
      ),
    [plugin, byModule],
  );
};
