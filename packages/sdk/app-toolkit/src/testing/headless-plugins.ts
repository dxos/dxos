//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, type Plugin, PluginManager } from '@dxos/app-framework';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import * as AppActivationEvents from '../app-framework/AppActivationEvents.ts';
import * as AppCapabilities from '../app-framework/AppCapabilities.ts';

/** What a headless host (e.g. EDGE's operation-service) reads from activated plugins. */
export type HeadlessPluginSummary = {
  readonly failures: readonly PluginManager.PluginFailure[];
  readonly operationKeys: readonly string[];
  readonly typenames: readonly string[];
};

/**
 * Activates plugins the way a headless host does — Startup, Idle and AssistantStart, with no React
 * tree — and reports the operation keys and schema typenames they contribute.
 *
 * Mirrors the EDGE operation-service registry so a workerd smoke test catches a plugin that stops
 * loading, or stops contributing operations or types, outside Composer.
 */
export const activateHeadlessPlugins = async (plugins: readonly Plugin.Plugin[]): Promise<HeadlessPluginSummary> => {
  const manager = PluginManager.make({
    pluginLoader: (id: string) =>
      Effect.sync(() => {
        const plugin = plugins.find((entry) => entry.meta.profile.key === id);
        invariant(plugin, `Plugin not found: ${id}`);
        return { plugin };
      }),
    plugins: [...plugins],
    enabled: plugins.map((plugin) => plugin.meta.profile.key),
  });

  try {
    await EffectEx.runAndForwardErrors(
      Effect.all([
        manager.activate(ActivationEvents.Startup),
        manager.activate(ActivationEvents.Idle),
        manager.activate(AppActivationEvents.AssistantStart),
      ]).pipe(Effect.scoped),
    );

    const handlers = await OperationHandlerSet.merge(
      ...manager.capabilities.getAll(Capabilities.OperationHandler),
    ).getHandlers();

    return {
      failures: manager.getFailed(),
      operationKeys: handlers.map((handler) => String(handler.meta.key)),
      typenames: manager.capabilities
        .getAll(AppCapabilities.Schema)
        .flat()
        .map((type) => Type.getTypename(type)),
    };
  } finally {
    await EffectEx.runAndForwardErrors(manager.shutdown());
  }
};
