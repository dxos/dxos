//
// Copyright 2025 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { useEffect } from 'react';

import { raise } from '@dxos/debug';

import { createApp, type CreateAppOptions } from '../App';
import { Capabilities, Events } from '../common';
import {
  type ActivationEvent,
  type AnyCapability,
  contributes,
  defineModule,
  definePlugin,
  PluginManager,
  type PluginContext,
} from '../core';

// TODO(burdon): Factor out (use consistently in plugin framework?)
export type Provider<C, R> = (context: C) => R;
export type ProviderOrValue<C, R> = Provider<C, R> | R;
export const getValue = <C, R>(providerOrValue: ProviderOrValue<C, R>, context: C): R => {
  return typeof providerOrValue === 'function' ? (providerOrValue as Provider<C, R>)(context) : providerOrValue;
};

/**
 * @internal
 */
export const setupPluginManager = ({
  capabilities,
  plugins = [],
  core = plugins.map(({ meta }) => meta.id),
  ...options
}: CreateAppOptions & Pick<WithPluginManagerOptions, 'capabilities'> = {}) => {
  const pluginManager = new PluginManager({
    pluginLoader: () => raise(new Error('Not implemented')),
    plugins: [StoryPlugin(), ...plugins],
    core: [STORY_PLUGIN, ...core],
    ...options,
  });

  if (capabilities) {
    getValue(capabilities, pluginManager.context).forEach((capability) => {
      pluginManager.context.contributeCapability({
        interface: capability.interface,
        implementation: capability.implementation,
        module: 'story',
      });
    });
  }

  return pluginManager;
};

export type WithPluginManagerOptions = CreateAppOptions & {
  capabilities?: ProviderOrValue<PluginContext, AnyCapability[]>;
  fireEvents?: (ActivationEvent | string)[];
};

/**
 * Wraps a story with a plugin manager.
 */
export const withPluginManager = (options: WithPluginManagerOptions = {}): Decorator => {
  const pluginManager = setupPluginManager(options);
  const App = createApp({ pluginManager });

  options.fireEvents?.forEach((event) => {
    void pluginManager.activate(event);
  });

  return (Story, context) => {
    useEffect(() => {
      const capability = contributes(Capabilities.ReactRoot, {
        id: context.id,
        root: () => <Story />,
      });

      pluginManager.context.contributeCapability({
        ...capability,
        module: 'dxos.org/app-framework/withPluginManager',
      });

      return () => pluginManager.context.removeCapability(capability.interface, capability.implementation);
    }, []);

    return <App />;
  };
};

// No-op plugin to ensure there exists at least one plugin for the startup event.
// This is necessary because `createApp` expects the startup event to complete before the app is ready.
const STORY_PLUGIN = 'dxos.org/app-framework/story';
const StoryPlugin = () =>
  definePlugin({ id: STORY_PLUGIN, name: 'Story' }, [
    defineModule({ id: STORY_PLUGIN, activatesOn: Events.Startup, activate: () => [] }),
  ]);
