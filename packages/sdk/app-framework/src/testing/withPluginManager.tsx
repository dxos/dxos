//
// Copyright 2025 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { raise } from '@dxos/debug';

import { type AnyCapability, PluginManager, type PluginManagerOptions } from '../core';
import { PluginManagerProvider } from '../react';

/**
 * Wraps a story with a plugin manager.
 */
export const withPluginManager = (
  options: Partial<PluginManagerOptions> & { capabilities?: AnyCapability[] } = {},
): Decorator => {
  const pluginManager = new PluginManager({
    pluginLoader: () => raise(new Error('Not implemented')),
    ...options,
  });

  if (options.capabilities) {
    options.capabilities.forEach((capability) => {
      pluginManager.context.contributeCapability(capability.interface, capability.implementation);
    });
  }

  return (Story) => (
    <PluginManagerProvider value={pluginManager}>
      <Story />
    </PluginManagerProvider>
  );
};
