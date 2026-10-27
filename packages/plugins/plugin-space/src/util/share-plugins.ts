//
// Copyright 2026 DXOS.org
//

import type * as PluginManager from '@dxos/app-framework/PluginManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';

import { SpaceCapabilities } from '#types';

/**
 * Plugins that render objects of `typenames`: for each, the plugin whose schema module registers it, preferring the one
 * that also offers to create it, since several plugins may register one type. Core plugins are left out — they are
 * always on — and so is a type no enabled plugin registers, which only the sender's enabled plugins can name.
 */
export const getPluginsForTypenames = (
  manager: PluginManager.PluginManager,
  typenames: readonly string[],
): string[] => {
  const schemasByModule = manager.registry.get(manager.capabilities.atomByModule(AppCapabilities.Schema));
  const createEntriesByModule = manager.registry.get(
    manager.capabilities.atomByModule(SpaceCapabilities.CreateObjectEntry),
  );
  const plugins = manager.getPlugins();
  const core = new Set(manager.getCore());

  const pluginIds = new Set<string>();
  for (const typename of new Set(typenames)) {
    const registrarModuleIds = new Set(
      Object.entries(schemasByModule)
        .filter(([, contributions]) =>
          contributions.some((schemas) => schemas.some((schema) => Type.getTypename(schema) === typename)),
        )
        .map(([moduleId]) => moduleId),
    );
    const registrars = plugins.filter((plugin) => plugin.modules.some((module) => registrarModuleIds.has(module.id)));
    const owner =
      registrars.find((plugin) =>
        plugin.modules.some((module) =>
          (createEntriesByModule[module.id] ?? []).some((entry) => entry.id === typename),
        ),
      ) ?? registrars[0];
    if (owner && !core.has(owner.meta.profile.key)) {
      pluginIds.add(owner.meta.profile.key);
    }
  }

  return [...pluginIds];
};
