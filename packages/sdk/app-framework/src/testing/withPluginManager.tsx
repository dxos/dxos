//
// Copyright 2025 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { useEffect } from 'react';

import { raise } from '@dxos/debug';

import { createApp, type CreateAppOptions } from '../App';
import { Capabilities } from '../common';
import { type AnyCapability, contributes, PluginManager } from '../core';

/**
 * Wraps a story with a plugin manager.
 */
export const withPluginManager = ({
  capabilities,
  ...options
}: CreateAppOptions & { capabilities?: AnyCapability[] } = {}): Decorator => {
  const pluginManager = new PluginManager({
    pluginLoader: () => raise(new Error('Not implemented')),
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
