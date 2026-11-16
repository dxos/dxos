//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';

import type * as Capability from '@dxos/app-framework/Capability';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';

/** The inspected plugin, once the manager has it. */
export const useInspectedPlugin = (pluginId: string | undefined): Plugin.Plugin | undefined => {
  const manager = PluginManagerProvider.usePluginManager();
  const plugins = useAtomValue(manager.plugins);
  return plugins.find((plugin) => plugin.meta.profile.key === pluginId);
};

/** What the given modules contribute to `interfaceDef`, in module order. */
export const useContributions = <T>(
  moduleIds: readonly string[],
  interfaceDef: Capability.InterfaceDef<T>,
): readonly T[] => {
  const manager = PluginManagerProvider.usePluginManager();
  const byModule = useAtomValue(manager.capabilities.atomByModule(interfaceDef));
  return moduleIds.flatMap((moduleId) => byModule[moduleId] ?? []);
};
