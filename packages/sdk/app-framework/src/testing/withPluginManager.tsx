//
// Copyright 2025 DXOS.org
//

import { type Decorator, type StoryContext } from '@storybook/react';
import * as Effect from 'effect/Effect';
import React, { useEffect, useRef, useState } from 'react';

import { raise } from '@dxos/debug';
import { runAndForwardErrors } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { useAsyncEffect } from '@dxos/react-hooks';
import { type MaybeProvider, getProviderValue } from '@dxos/util';

import { ActivationEvents, Capabilities } from '../common';
import { type ActivationEvent, Capability, type CapabilityManager, Plugin, PluginManager } from '../core';
import { type UseAppOptions, useApp } from '../ui';

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
  const enabled = plugins.filter(({ meta }) => !meta.tags?.includes('system')).map(({ meta }) => meta.id);
  const pluginManager = PluginManager.make({
    pluginLoader: () => raise(new Error('Not implemented')),
    plugins: [StoryPlugin, ...plugins],
    enabled,
    ...options,
  });

  if (capabilities) {
    getProviderValue(capabilities, pluginManager.capabilities).forEach((capability) => {
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
  fireEvents?: (ActivationEvent.ActivationEvent | string)[];
  pluginManager: PluginManager.PluginManager;
  setupEvents?: ActivationEvent.ActivationEvent[];
  storyId: string;
};

export type WithPluginManagerOptions = UseAppOptions & {
  /** @deprecated */
  capabilities?: MaybeProvider<Capability.Any[], CapabilityManager.CapabilityManager>;
  /** @deprecated */
  fireEvents?: (ActivationEvent.ActivationEvent | string)[];
};

export type WithPluginManagerInitializer<Args = void> =
  | WithPluginManagerOptions
  | ((context: StoryContext<Args>) => WithPluginManagerOptions);

/**
 * Wraps a story with a plugin manager.
 *
 * The manager is initialised synchronously so it is ready before Storybook's
 * `play` function runs. A separate effect tears it down when the story changes
 * or the decorator unmounts.
 */
export const withPluginManager = <Args,>(init: WithPluginManagerInitializer<Args> = {}): Decorator => {
  return (Story, context) => {
    const storyId = context.id;
    const options = typeof init === 'function' ? init(context as any) : init;

    // Initialise synchronously so the manager is ready on the very first render
    // and Storybook's play() function does not race against a useEffect.
    const [managerState, setManagerState] = useState<ManagedPluginManagerState>(() => {
      const pluginManager = setupPluginManager(options);
      pluginManager.capabilities.contribute({
        ...Capability.contributes(Capabilities.ReactRoot, { id: storyId, root: () => <Story /> }),
        module: 'org.dxos.app-framework.with-plugin-manager',
      });
      return { pluginManager, setupEvents: options.setupEvents, fireEvents: options.fireEvents, storyId };
    });

    // Keep a stable ref to the current manager so the cleanup effect can always
    // reach the latest instance without listing it as a dependency.
    const managerRef = useRef(managerState);
    managerRef.current = managerState;

    // Re-initialise when the story id changes (Storybook navigation) and tear
    // down the previous manager.
    useEffect(() => {
      if (managerState.storyId === storyId) {
        // Already initialised for this story — just register the teardown.
        return () => {
          const { pluginManager } = managerRef.current;
          void runAndForwardErrors(pluginManager.shutdown());
        };
      }

      // Story changed: build a fresh manager synchronously.
      const pluginManager = setupPluginManager(options);
      pluginManager.capabilities.contribute({
        ...Capability.contributes(Capabilities.ReactRoot, { id: storyId, root: () => <Story /> }),
        module: 'org.dxos.app-framework.with-plugin-manager',
      });
      setManagerState({ pluginManager, setupEvents: options.setupEvents, fireEvents: options.fireEvents, storyId });

      return () => {
        void runAndForwardErrors(pluginManager.shutdown());
      };
    }, [storyId]);

    // Avoid rendering a stale manager while a new one is being constructed.
    if (managerState.storyId !== storyId) {
      return <></>;
    }

    return <WithPluginManagerApp {...managerState} />;
  };
};

const WithPluginManagerApp = ({ fireEvents, pluginManager, setupEvents, storyId }: ManagedPluginManagerState) => {
  // Fire deprecated events only after the effect-owned manager for this story exists.
  useAsyncEffect(async () => {
    await Promise.all(fireEvents?.map((event) => pluginManager.activate(event)) ?? []);
  }, [fireEvents, pluginManager, storyId]);

  const App = useApp({ pluginManager, setupEvents });
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
