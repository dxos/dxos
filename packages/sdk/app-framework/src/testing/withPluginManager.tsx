//
// Copyright 2025 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { useEffect } from 'react';

import { raise } from '@dxos/debug';

import { createApp, type CreateAppOptions } from '../App';
import { Capabilities, Events } from '../common';
import { type AnyCapability, contributes, defineModule, definePlugin, PluginManager } from '../core';

/**
 * @internal
 */
export const setupPluginManager = ({
  capabilities,
  plugins = [],
  core = plugins.map(({ meta }) => meta.id),
  ...options
}: CreateAppOptions & { capabilities?: AnyCapability[] } = {}) => {
  const pluginManager = new PluginManager({
    pluginLoader: () => raise(new Error('Not implemented')),
    plugins: [StoryPlugin(), ...plugins],
    core: [STORY_PLUGIN, ...core],
    ...options,
  });

  if (capabilities) {
    capabilities.forEach((capability) => {
      pluginManager.context.contributeCapability({
        interface: capability.interface,
        implementation: capability.implementation,
        module: 'story',
      });
    });
  }

  return pluginManager;
};

/**
 * Wraps a story with a plugin manager.
 */
export const withPluginManager = (options: CreateAppOptions & { capabilities?: AnyCapability[] } = {}): Decorator => {
  const pluginManager = setupPluginManager(options);
  const App = createApp({ pluginManager });

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
  definePlugin({ id: STORY_PLUGIN }, [
    defineModule({ id: STORY_PLUGIN, activatesOn: Events.Startup, activate: () => [] }),
  ]);
