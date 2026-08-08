//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

import * as Capabilities from './common/capabilities';
import { type PluginManager } from './core';

/** Summary of one registered plugin. */
export type PluginInfo = {
  id: string;
  name?: string;
  description?: string;
  /** Core plugins cannot be disabled. */
  core: boolean;
  enabled: boolean;
  /** At least one of the plugin's modules has activated. */
  active: boolean;
  moduleIds: string[];
};

/** Summary of one operation, enumerated without loading its handler. */
export type OperationInfo = {
  key: string;
  name?: string;
  description?: string;
  /** Derived from the contributing module id; absent when the operation came from outside a plugin. */
  pluginId?: string;
  moduleId?: string;
};

/**
 * `globalThis.composer` — the app-layer console namespace, the counterpart to `__DXOS__`/`dxos`
 * (client and ECHO). Populated as the app boots, so every member is optional; the declaration buys
 * type-checking at call sites, not a presence guarantee.
 */
export type ComposerDevtools = {
  manager?: PluginManager.PluginManager;
  plugins?: () => PluginInfo[];
  operations?: (pluginId?: string) => OperationInfo[];
  invoke?: (key: string, input?: unknown) => Promise<unknown>;
  [key: string]: unknown;
};

declare global {
  // eslint-disable-next-line no-var
  var composer: ComposerDevtools | undefined;
}

/**
 * Module ids are `org.dxos.plugin.<slug>.module.<name>`; the plugin id is everything before
 * `.module.`. Returns undefined for ids that do not follow the convention.
 */
const pluginIdOf = (moduleId: string): string | undefined => {
  const index = moduleId.indexOf('.module.');
  return index === -1 ? undefined : moduleId.slice(0, index);
};

/**
 * Attaches the plugin/operation console API to `globalThis.composer`.
 *
 * Lives at the framework level rather than in a devtools plugin so it is present in any app and
 * does not depend on which plugins happen to be enabled — inspecting a broken plugin set is
 * exactly when this is wanted.
 */
export const setupDevtools = (manager: PluginManager.PluginManager): void => {
  const listOperations = (pluginId?: string): OperationInfo[] => {
    const byModule = manager.registry.get(manager.capabilities.atomByModule(Capabilities.OperationHandler));
    return Object.entries(byModule).flatMap(([moduleId, sets]) => {
      const owner = pluginIdOf(moduleId);
      if (pluginId && owner !== pluginId) {
        return [];
      }
      // `definitions()` is the enumerate-without-loading path; `getHandlers()` would pull every
      // lazily-imported handler module just to list them.
      return sets.flatMap((set) =>
        set.definitions().map((definition) => ({
          key: definition.meta.key,
          name: definition.meta.name,
          description: definition.meta.description,
          pluginId: owner,
          moduleId,
        })),
      );
    });
  };

  // Definitions carry DXN-form keys, so accept either that or the bare NSID — same normalization
  // the handler sets apply, so whatever `operations()` prints can be pasted straight into `invoke`.
  const normalizeKey = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

  const findDefinition = (key: string): Operation.Definition.Any | undefined => {
    const wanted = normalizeKey(key);
    for (const set of manager.capabilities.getAll(Capabilities.OperationHandler)) {
      const definition = set.definitions().find((candidate) => normalizeKey(candidate.meta.key) === wanted);
      if (definition) {
        return definition;
      }
    }
    return undefined;
  };

  const composer: ComposerDevtools = (globalThis.composer ??= {});
  composer.manager = manager;

  composer.plugins = () => {
    const core = new Set(manager.getCore());
    const enabled = new Set(manager.getEnabled());
    const active = new Set(manager.getActive());
    return manager.getPlugins().map((plugin) => {
      const id = plugin.meta.profile.key;
      return {
        id,
        name: plugin.meta.profile.name,
        description: plugin.meta.profile.description,
        core: core.has(id),
        enabled: enabled.has(id),
        active: plugin.modules.some((module) => active.has(module.id)),
        moduleIds: plugin.modules.map((module) => module.id),
      };
    });
  };

  composer.operations = listOperations;

  composer.invoke = async (key, input) => {
    const definition = findDefinition(key);
    if (!definition) {
      throw new Error(`Unknown operation: ${key} (try composer.operations())`);
    }
    const invoker = manager.capabilities.get(Capabilities.OperationInvoker);
    const { data, error } = await invoker.invokePromise(definition, input as never);
    if (error) {
      throw error;
    }
    return data;
  };
};
