//
// Copyright 2026 DXOS.org
//

//
// Shared story-harness substrate for the stories-* packages: theme + fullscreen layout + a plugin
// manager wired with the client (identity/seeding/snapshot import) and the runtime-layout atom.
// Domain packages layer their own plugins and context binding on top — see `stories-assistant`'s
// `createDecorators` for the heavyweight example.
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type FC, type PropsWithChildren, type ReactNode, useEffect, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import { type WithPluginManagerOptions, activateDemandGatedModules } from '@dxos/app-framework/testing';
import { useApp } from '@dxos/app-framework/ui';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { persistentClientServices } from '@dxos/client/testing';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { AccessToken } from '@dxos/link';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { type ClientPluginOptions } from '@dxos/plugin-client/ClientOptions';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { StoryLayout } from './layout';
import { type ModuleLayout } from './ModuleContainer';
import { initClientFromSpaceSnapshot } from './snapshot';

type LazyPluginsResult = {
  plugins: Plugin.Plugin[];
  types?: any[];
};

export type StoryDecoratorsProps = {
  plugins?: Plugin.Plugin[];
  /** Import heavy plugins on story mount instead of at module load. */
  lazyPlugins?: () => Promise<LazyPluginsResult>;
  accessTokens?: AccessToken.AccessToken[];
  /** Import a `.dx.json` space archive instead of creating an empty space. */
  importSnapshot?: () => Promise<unknown>;
  /** Seed the default space; an optionally returned layout is published via {@link StoryLayout.Atom}. */
  onInit?: (props: { client: Client; space: Space }) => Promise<ModuleLayout | void>;
  /** Forwarded to `useApp` so plugins contribute setup-gated capabilities (e.g. settings). */
  setupEvents?: WithPluginManagerOptions['setupEvents'];
  /** Rendered inside the plugin-manager context, wrapping the story (e.g. a chat-context binder). */
  Wrapper?: FC<PropsWithChildren>;
} & Omit<ClientPluginOptions, 'onClientInitialized' | 'onSpacesReady'>;

/**
 * Props, or a function of the story context — the function form gives seeding code access to the
 * story's `args` (mirroring `withPluginManager`).
 */
export type StoryDecoratorsInput<Args = any> =
  | StoryDecoratorsProps
  | ((context: { args: Args }) => StoryDecoratorsProps);

/**
 * Owns the runtime story layout: contributes the atom {@link ModuleContainer} reads, and publishes
 * the layout built by `onInit` (which runs during client init, before `SpacesReady`).
 */
type LayoutPluginOptions = {
  layoutAtom: Atom.Writable<ModuleLayout | undefined>;
  layoutHolder: { current?: ModuleLayout };
};

const StoryLayoutPlugin = Plugin.define<LayoutPluginOptions>(
  Plugin.makeMeta({ key: DXN.make('org.dxos.storybook.plugin.layout'), name: 'Story Layout' }),
).pipe(
  Plugin.addModule(({ layoutAtom }) => ({
    id: 'org.dxos.storybook.plugin.layout.module.atom',
    provides: [StoryLayout.Atom],
    activate: () => Effect.succeed([Capability.contribute(StoryLayout.Atom, layoutAtom)]),
  })),
  Plugin.addModule(({ layoutAtom, layoutHolder }) => ({
    id: 'org.dxos.storybook.plugin.layout.module.publish',
    // Runtime event: the layout references space objects, so it is only publishable once the
    // client observes the space.
    activatesOn: ClientEvents.SpacesReady,
    requires: [Capabilities.AtomRegistry],
    activate: Effect.fnUntraced(function* () {
      if (layoutHolder.current) {
        const registry = yield* Capabilities.AtomRegistry;
        registry.set(layoutAtom, layoutHolder.current);
      }
      return [];
    }),
  })),
  Plugin.make,
);

/**
 * Builds the plugin-manager options: core plugins, the client (with identity init, optional
 * snapshot import, access tokens, and the `onInit` seeding hook), the storybook plugin, and the
 * runtime-layout publication.
 */
const buildStoryPluginOptions = ({
  types = [],
  plugins = [],
  accessTokens = [],
  importSnapshot,
  onInit,
  setupEvents,
  config,
  Wrapper: _Wrapper,
  ...props
}: Omit<StoryDecoratorsProps, 'lazyPlugins'>): WithPluginManagerOptions => {
  // A config flagging `storage.persistent` needs the dedicated/coordinator worker pair; every
  // other config stays a plain ephemeral client.
  const clientServices = config?.values.runtime?.client?.storage?.persistent
    ? persistentClientServices(config)
    : { config };

  // `onInit` fills the holder during client init; the layout plugin publishes it on SpacesReady.
  const layoutHolder: { current?: ModuleLayout } = {};
  const layoutAtom = Atom.make<ModuleLayout | undefined>(undefined);

  return {
    setupEvents,
    plugins: [
      ...corePlugins(),
      ClientPlugin.make({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            // Abort if already initialized.
            if (client.halo.identity.get()) {
              return;
            }

            if (importSnapshot) {
              yield* initClientFromSpaceSnapshot(importSnapshot)({ client });
              const [space] = client.spaces.get();
              invariant(space, 'No space available after snapshot import.');
              for (const accessToken of accessTokens) {
                space.db.add(Obj.clone(accessToken));
              }

              if (onInit) {
                layoutHolder.current = (yield* Effect.promise(() => onInit({ client, space }))) || undefined;
              }

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
              return;
            }

            const { defaultSpace: space } = yield* initializeIdentity(client);

            for (const accessToken of accessTokens) {
              space.db.add(Obj.clone(accessToken));
            }

            yield* Effect.promise(() => space.db.flush({ indexes: true }));
            if (onInit) {
              layoutHolder.current = (yield* Effect.promise(() => onInit({ client, space }))) || undefined;
            }
            yield* Effect.promise(() => space.db.flush({ indexes: true }));
          }),
        ...clientServices,
        ...props,
      }),
      StorybookPlugin.make({}),
      StoryLayoutPlugin({ layoutAtom, layoutHolder }),
      ...plugins,
    ],
  };
};

/**
 * Creates the plugin manager and renders the app. Separated to respect React hooks rules (hooks
 * must be called unconditionally).
 */
const PluginManagerHost = ({
  options,
  children,
  contextId,
}: {
  options: WithPluginManagerOptions;
  children: ReactNode;
  contextId: string;
}) => {
  const manager = useMemo(() => {
    const pluginManager = PluginManager.make({
      pluginLoader: () => Effect.die(new Error('Not implemented')),
      plugins: options.plugins ?? [],
      enabled: (options.plugins ?? []).map(({ meta }) => meta.profile.key),
    });

    // `useApp` contributes these too, but from an effect registered AFTER this component's own —
    // which kicks off activation — so the startup pass would reach a module requiring `AtomRegistry`
    // with no provider registered and nothing to wait for. Contribute at construction instead.
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

    return pluginManager;
  }, [options]);

  // The ReactRoot contribution tracks `children` (recreated per render), but shutdown must not:
  // tearing the manager down from a re-render's cleanup would leave the mounted story running
  // against a dead manager.
  useEffect(() => {
    const [capability] = CapabilityManager.expandContributions([
      Capability.contribute(Capabilities.ReactRoot, {
        id: contextId,
        root: () => <>{children}</>,
      }),
    ]);

    manager.capabilities.contribute({
      interface: capability.interface,
      implementation: capability.implementation,
      module: 'org.dxos.app-framework.with-plugin-manager.lazy',
    });

    return () => {
      manager.capabilities.remove(capability.interface, capability.implementation);
    };
  }, [manager, contextId, children]);

  useEffect(() => {
    // A story mounts one surface, so no demand ever reaches the modules gated behind it. The
    // `withPluginManager` path does this for us; this lazy path builds its own manager and so
    // must do it too, or Idle-gated contributions (assistant settings) never land and the first
    // strict `useAtomCapability` read throws.
    EffectEx.runDetached(activateDemandGatedModules(manager));

    return () => {
      void EffectEx.runAndForwardErrors(manager.shutdown());
    };
  }, [manager]);

  // Forward `setupEvents` (e.g. SetupSettings) so plugins contribute their settings capabilities;
  // `useApp` is what fires them, and without this the lazy path skips them (the non-lazy
  // `withPluginManager` path forwards them automatically).
  const App = useApp({ pluginManager: manager, setupEvents: options.setupEvents });
  return <App />;
};

/**
 * Create story decorators: theme + fullscreen layout + the plugin-manager harness. Supports lazy
 * plugin loading (`lazyPlugins`), seeding (`onInit`), and the function form for story-args access.
 */
export const createStoryDecorators = <Args = any,>(input: StoryDecoratorsInput<Args> = {}) => {
  const host = ((Story: FC, context: { id: string; args: Args }) => {
    // The function form re-resolves when args change (a Controls edit reboots the whole harness —
    // correct, since the seeded space depends on them).
    const props = useMemo(
      () => (typeof input === 'function' ? input({ args: context.args }) : input),
      // `input` is stable per createStoryDecorators call.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [context.args],
    );

    // Non-lazy stories start with options ready ({ plugins: [] } is truthy); lazy stories wait.
    const [lazyResult, setLazyResult] = useState<LazyPluginsResult | null>(props.lazyPlugins ? null : { plugins: [] });
    useEffect(() => {
      if (props.lazyPlugins) {
        void props.lazyPlugins().then(setLazyResult);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const options = useMemo(
      () =>
        lazyResult
          ? buildStoryPluginOptions({
              ...props,
              plugins: [...(props.plugins ?? []), ...(lazyResult.plugins ?? [])],
              types: [...(props.types ?? []), ...(lazyResult.types ?? [])],
            })
          : null,
      [lazyResult, props],
    );

    if (!options) {
      return null;
    }

    const Wrapper = props.Wrapper;
    return (
      <PluginManagerHost options={options} contextId={context.id}>
        {Wrapper ? (
          <Wrapper>
            <Story />
          </Wrapper>
        ) : (
          <Story />
        )}
      </PluginManagerHost>
    );
  }) as any;

  return [withTheme(), withLayout({ layout: 'fullscreen' }), host];
};

/**
 * Creates access tokens from environment variables.
 * @param tokens - Record of token sources mapped to their VITE_ prefixed environment variable values
 * @returns Array of AccessToken objects for non-empty token values
 * @example
 * ```tsx
 * const tokens = accessTokensFromEnv({
 *   'exa.ai': process.env.VITE_EXA_API_KEY,
 *   'linear.app': process.env.VITE_LINEAR_API_KEY
 * });
 * ```
 * @note All environment variables should use the VITE_ prefix for proper Vite bundling
 */
export const accessTokensFromEnv = (tokens: Record<string, string | undefined>) => {
  return Object.entries(tokens).flatMap(([source, token]) =>
    token ? [Obj.make(AccessToken.AccessToken, { source, token })] : [],
  );
};
