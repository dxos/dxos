//
// Copyright 2025 DXOS.org
//

import { type Decorator, type StoryContext } from '@storybook/react';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo } from 'react';

import { raise } from '@dxos/debug';
import { useAsyncEffect } from '@dxos/react-hooks';
import { type MaybeProvider, getProviderValue } from '@dxos/util';

import * as Common from '../common';
import { type ActivationEvent, Capability, Plugin, PluginManager } from '../core';
import { type UseAppOptions, useApp } from '../react';

/**
 * @internal
 */
export const setupPluginManager = ({
  capabilities,
  plugins = [],
  core = plugins.map(({ meta }) => meta.id),
  ...options
}: UseAppOptions & Pick<WithPluginManagerOptions, 'capabilities'> = {}) => {
  const pluginManager = PluginManager.make({
    pluginLoader: () => raise(new Error('Not implemented')),
    plugins: [StoryPlugin, ...plugins],
    core: [StoryPlugin.meta.id, ...core],
    ...options,
  });

  if (capabilities) {
    getProviderValue(capabilities, pluginManager.context).forEach((capability) => {
      pluginManager.context.contributeCapability({
        interface: capability.interface,
        implementation: capability.implementation,
        module: 'story',
      });
    });
  }

  return pluginManager;
};

export type WithPluginManagerOptions = UseAppOptions & {
  /** @deprecated */
  capabilities?: MaybeProvider<Capability.Any[], Capability.PluginContext>;
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
    const options = typeof init === 'function' ? init(context as any) : init;
    const pluginManager = useMemo(() => setupPluginManager(options), [init]);

    // Set-up root capability.
    useEffect(() => {
      const capability = Capability.contributes(Common.Capability.ReactRoot, {
        id: context.id,
        root: () => <Story />,
      });

      pluginManager.context.contributeCapability({
        ...capability,
        module: 'dxos.org/app-framework/withPluginManager',
      });

      return () => {
        pluginManager.context.removeCapability(capability.interface, capability.implementation);
      };
    }, [pluginManager, context]);

    // Fire events.
    useAsyncEffect(async () => {
      await Promise.all(options.fireEvents?.map((event) => pluginManager.activate(event)) ?? []);
    }, [pluginManager]);

    // Create app.
    const App = useApp({ pluginManager });

    return <App />;
  };
};

const storyMeta = {
  id: 'dxos.org/app-framework/story',
  name: 'Story',
};

// No-op plugin to ensure there exists at least one plugin for the startup event.
// This is necessary because `createApp` expects the startup event to complete before the app is ready.
const StoryPlugin = Plugin.define(storyMeta).pipe(
  Plugin.addModule({
    id: 'Story',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => Effect.succeed([]),
  }),
  Plugin.make,
)();
