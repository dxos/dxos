//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type { OpaqueToolkit } from '@dxos/ai';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import type * as Skill from '@dxos/compute/Skill';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';

/** The plugins of a release: the one it publishes, and the plugins its `dependsOn` closure may draw on. */
export type Plugins = {
  readonly primary: Plugin.Plugin;
  readonly dependencies?: readonly Plugin.Plugin[];
};

/**
 * What a host reads from its activated plugins.
 *
 * A release publishes only what its primary plugin contributes: its dependencies are activated so the primary can use
 * their capabilities, and publish their own operations, skills and types in their own releases.
 */
export type Activation = {
  readonly primary: Plugin.Plugin;
  /** Every activated plugin: the primary and its `dependsOn` closure. */
  readonly plugins: readonly Plugin.Plugin[];
  readonly capabilities: CapabilityManager.CapabilityManager;
  /** ECHO types the primary contributes. */
  readonly types: readonly Type.AnyEntity[];
  /** ECHO types every activated plugin contributes, registered with every space-scoped invocation. */
  readonly registeredTypes: readonly Type.AnyEntity[];
  /** Instantiate per invocation: `make()` mints ids with `crypto.getRandomValues()`, allowed only inside a request. */
  readonly skills: readonly Skill.Definition[];
  readonly toolkits: readonly OpaqueToolkit.OpaqueToolkit[];
  /** The primary's operations: the only ones the release serves. */
  readonly operationHandlers: readonly Operation.WithHandler<Operation.Definition.Any>[];
  readonly failures: readonly PluginManager.PluginFailure[];
};

/**
 * The primary and the plugins its `dependsOn` names, transitively. A dependency the pool lacks is left out, so the
 * plugin manager reports it as missing.
 */
export const resolve = ({ primary, dependencies = [] }: Plugins): Plugin.Plugin[] => {
  const byKey = new Map(dependencies.map((plugin) => [plugin.meta.profile.key, plugin]));
  const resolved = new Map<string, Plugin.Plugin>();
  const visit = (plugin: Plugin.Plugin) => {
    if (resolved.has(plugin.meta.profile.key)) {
      return;
    }
    resolved.set(plugin.meta.profile.key, plugin);
    for (const key of plugin.meta.profile.dependsOn ?? []) {
      const dependency = byKey.get(key);
      if (dependency) {
        visit(dependency);
      }
    }
  };
  visit(primary);
  return [...resolved.values()];
};

/**
 * Activates a release's plugins the way a headless host does: Startup, Idle and AssistantStart, with no React tree.
 *
 * Must run inside a request: the plugin manager schedules Effect fibers that use timers, which workerd disallows in
 * global scope.
 */
export const activate = async (release: Plugins): Promise<Activation> => {
  const plugins = resolve(release);
  const manager = PluginManager.make({
    pluginLoader: (id: string) =>
      Effect.sync(() => {
        const plugin = plugins.find((entry) => entry.meta.profile.key === id);
        invariant(plugin, `Plugin not found: ${id}`);
        return { plugin };
      }),
    plugins,
    enabled: plugins.map((plugin) => plugin.meta.profile.key),
  });

  await EffectEx.runAndForwardErrors(
    Effect.all([
      manager.activate(ActivationEvents.Startup),
      // Operation handlers and schema modules default to Idle.
      manager.activate(ActivationEvents.Idle),
      // Skills default to AssistantStart; without it a headless host registers none.
      manager.activate(AppActivationEvents.AssistantStart),
    ]).pipe(Effect.scoped),
  );

  const primaryModules = new Set(release.primary.modules.map((module) => module.id));
  const ofPrimary = <T>(capability: Capability.InterfaceDef<T>): T[] =>
    Object.entries(manager.registry.get(manager.capabilities.atomByModule(capability))).flatMap(([moduleId, values]) =>
      primaryModules.has(moduleId) ? values : [],
    );

  const operationHandlers = await OperationHandlerSet.merge(...ofPrimary(Capabilities.OperationHandler)).getHandlers();

  return {
    primary: release.primary,
    plugins,
    capabilities: manager.capabilities,
    types: dedupeBy(ofPrimary(AppCapabilities.Schema).flat(), (type) => Type.getTypename(type)),
    registeredTypes: dedupeBy(manager.capabilities.getAll(AppCapabilities.Schema).flat(), (type) =>
      Type.getTypename(type),
    ),
    // A plugin may contribute one skill twice; the MCP projection rejects a repeated prompt name.
    skills: dedupeBy(ofPrimary(AppCapabilities.SkillDefinition), ({ key }) => String(key)),
    toolkits: manager.capabilities.getAll(AppCapabilities.Toolkit),
    operationHandlers,
    failures: manager.getFailed(),
  };
};

/** Keeps the first entry per key. */
const dedupeBy = <T>(values: readonly T[], keyOf: (value: T) => string): T[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = keyOf(value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
