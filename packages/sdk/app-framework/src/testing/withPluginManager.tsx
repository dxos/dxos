//
// Copyright 2025 DXOS.org
//

import { type Decorator, type StoryContext } from '@storybook/react';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { raise } from '@dxos/debug';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { useAsyncEffect } from '@dxos/react-hooks';
import { type MaybeProvider, getProviderValue } from '@dxos/util';

import { ActivationEvents, Capabilities } from '../common';
import { type ActivationEvent, Capability, type CapabilityManager, Plugin, PluginManager } from '../core';
import { type UseAppOptions, useApp } from '../ui';
import { StorybookErrorFallback } from './StorybookErrorFallback';

/**
 * @internal
 */
export const setupPluginManager = ({
  capabilities,
  plugins = [],
  ...options
}: UseAppOptions & Pick<WithPluginManagerOptions, 'capabilities'> = {}) => {
  // Auto-enable every non-system plugin so stories don't have to spell out
  // enablement. System-tagged plugins are force-enabled by the manager.
  const enabled = plugins
    .filter(({ meta }) => !meta.profile.tags?.includes('system'))
    .map(({ meta }) => meta.profile.key);
  const pluginManager = PluginManager.make({
    pluginLoader: () => raise(new Error('Not implemented')),
    plugins: [StoryPlugin, ...plugins],
    enabled,
    ...options,
  });

  if (capabilities) {
    // Fixtures hand us `Contribution`s (from `Capability.provide`); expand them to the raw
    // interface/implementation entries the manager ingests — the same path module activation uses.
    Capability.expandContributions(getProviderValue(capabilities, pluginManager.capabilities)).forEach((capability) => {
      pluginManager.capabilities.contribute({
        interface: capability.interface,
        implementation: capability.implementation,
        module: 'story',
      });
    });
  }

  return pluginManager;
};

type ManagedPluginManagerState = {
  fallback?: UseAppOptions['fallback'];
  fireEvents?: (ActivationEvent.ActivationEvent | string)[];
  pluginManager: PluginManager.PluginManager;
  setupEvents?: ActivationEvent.ActivationEvent[];
  storyId: string;
};

export type WithPluginManagerOptions = UseAppOptions & {
  /** @deprecated */
  capabilities?: MaybeProvider<Capability.AnyContribution[], CapabilityManager.CapabilityManager>;
  /** @deprecated */
  fireEvents?: (ActivationEvent.ActivationEvent | string)[];
};

export type WithPluginManagerInitializer<Args = void> =
  | WithPluginManagerOptions
  | ((context: StoryContext<Args>) => WithPluginManagerOptions);

/**
 * Wraps a story with a plugin manager.
 * NOTE: This builds up and tears down the plugin manager on every render.
 */
export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<Args> = {}): Decorator => {
  return (Story, context) => {
    const storyId = context.id;
    const options = typeof init === 'function' ? init(context as any) : init;
    const [managerState, setManagerState] = useState<ManagedPluginManagerState>();

    // Storybook replaces the full context object often, so key manager ownership by story id.
    useEffect(() => {
      const pluginManager = setupPluginManager(options);
      const [capability] = Capability.expandContributions([
        Capability.provide(Capabilities.ReactRoot, {
          id: storyId,
          root: () => <Story />,
        }),
      ]);

      pluginManager.capabilities.contribute({
        interface: capability.interface,
        implementation: capability.implementation,
        module: 'org.dxos.app-framework.with-plugin-manager',
      });

      setManagerState({
        pluginManager,
        setupEvents: options.setupEvents,
        fireEvents: options.fireEvents,
        fallback: options.fallback,
        storyId,
      });

      return () => {
        pluginManager.capabilities.remove(capability.interface, capability.implementation);
        void EffectEx.runAndForwardErrors(pluginManager.shutdown());
      };
    }, [storyId, init]);

    // Avoid mounting useApp with a stale manager from the previous story.
    if (!managerState || managerState.storyId !== storyId) {
      return <></>;
    }

    return <WithPluginManagerApp {...managerState} />;
  };
};

const WithPluginManagerApp = ({
  fallback,
  fireEvents,
  pluginManager,
  setupEvents,
  storyId,
}: ManagedPluginManagerState) => {
  // Fire deprecated events only after the effect-owned manager for this story exists.
  useAsyncEffect(async () => {
    await Promise.all(fireEvents?.map((event) => pluginManager.activate(event)) ?? []);
  }, [fireEvents, pluginManager, storyId]);

  // Default to a fallback that offers "Download logs" so a crashed story is still debuggable;
  // callers can override via `withPluginManager({ fallback })`.
  const App = useApp({ pluginManager, setupEvents, fallback: fallback ?? StorybookErrorFallback });
  return <App />;
};

const storyMeta = Plugin.makeMeta({
  key: DXN.make('org.dxos.appFramework.story'),
  name: 'Story',
  tags: ['system'],
});

// No-op plugin to ensure there exists at least one plugin for the startup event.
// This is necessary because `createApp` expects the startup event to complete before the app is ready.
const StoryPlugin = Plugin.define(storyMeta).pipe(
  Plugin.addModule({
    id: 'Story',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed([]),
  }),
  Plugin.make,
)();
