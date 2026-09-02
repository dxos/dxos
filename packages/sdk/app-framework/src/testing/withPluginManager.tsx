//
// Copyright 2025 DXOS.org
//

import { type Decorator, type StoryContext } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { raise } from '@dxos/debug';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { ErrorFallback } from '@dxos/react-error-boundary';
import { useAsyncEffect } from '@dxos/react-hooks';
import { type MaybeProvider, getProviderValue } from '@dxos/util';

import { ActivationEvents, Capabilities } from '../common';
import { type ActivationEvent, Capability, CapabilityManager, Plugin, PluginManager } from '../core';
import { type UseAppOptions, useApp } from '../ui';
import { activateDemandGatedModules } from './demand-gated';

/**
 * The fallback a crashed story renders, overridable per story via `withPluginManager({ fallback })`.
 * A global because importing `./testing` from the storybook preview drags the plugin core into every
 * project's dependency pre-bundle.
 */
declare global {
  // eslint-disable-next-line no-var
  var __STORY_ERROR_FALLBACK__: NonNullable<UseAppOptions['fallback']> | undefined;
}

/**
 * Builds a plugin manager for test hosts. Stories go through {@link withPluginManager}; headless
 * hook tests use this directly to supply the `PluginManagerProvider` value their wrapper needs.
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

  // The framework capabilities a real host contributes, mirroring `createTestApp`. Without these
  // no MODULE provides `AtomRegistry`, so any module requiring it fails the dependency pass's
  // missing-provider check with nothing to wait for — reached as soon as a requiring module sits
  // on the startup pass (attention, graph, the process manager).
  pluginManager.capabilities.contribute({
    interface: Capabilities.PluginManager,
    implementation: pluginManager,
    module: 'org.dxos.app-framework.plugin-manager',
  });
  pluginManager.capabilities.contribute({
    interface: Capabilities.AtomRegistry,
    implementation: pluginManager.registry,
    module: 'org.dxos.app-framework.atom-registry',
  });

  if (capabilities) {
    // Fixtures hand us `Contribution`s (from `Capability.contribute`); expand them to the raw
    // interface/implementation entries the manager ingests — the same path module activation uses.
    CapabilityManager.expandContributions(getProviderValue(capabilities, pluginManager.capabilities)).forEach(
      (capability) => {
        pluginManager.capabilities.contribute({
          interface: capability.interface,
          implementation: capability.implementation,
          module: 'story',
        });
      },
    );
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
      const [capability] = CapabilityManager.expandContributions([
        Capability.contribute(Capabilities.ReactRoot, {
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
        // A story switch tears down while the start-event trickle is still activating, which
        // interrupts the shutdown fiber — expected; real failures still surface.
        EffectEx.runDetached(pluginManager.shutdown());
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
  // Gates the first render: rendering before the start events land lets a component read a
  // capability that has not been contributed yet, which strict `useCapability` throws on.
  const [activated, setActivated] = useState(false);

  // Fire deprecated events only after the effect-owned manager for this story exists.
  useAsyncEffect(
    async (controller) => {
      await Promise.all(fireEvents?.map((event) => pluginManager.activate(event)) ?? []);
      // In the app plugins start on demand (surface render), but stories render one surface in
      // isolation — fire every start event so start-gated modules are present regardless of
      // which plugin's surface the story exercises. A story switch shuts the manager down
      // mid-trickle, interrupting the activation fiber — expected; real failures still surface.
      EffectEx.runDetached(
        activateDemandGatedModules(pluginManager).pipe(
          // Interruption skips this, so a torn-down story never flips the gate.
          Effect.andThen(
            Effect.sync(() => {
              if (!controller.signal.aborted) {
                setActivated(true);
              }
            }),
          ),
        ),
      );
    },
    [fireEvents, pluginManager, storyId],
  );

  const App = useApp({
    pluginManager,
    setupEvents,
    fallback: fallback ?? globalThis.__STORY_ERROR_FALLBACK__ ?? ErrorFallback,
  });
  return activated ? <App /> : <></>;
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
