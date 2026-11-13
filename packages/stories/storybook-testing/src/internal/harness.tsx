//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import React, {
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import {
  PluginManagerHost as AppPluginManagerHost,
  type WithPluginManagerOptions,
  activateDemandGatedModules,
} from '@dxos/app-framework/testing';
import type * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { persistentClientServices } from '@dxos/client/testing';
import { Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { DXN, type SpaceId } from '@dxos/keys';
import { type AccessToken } from '@dxos/link';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import type * as ClientOptions from '@dxos/plugin-client/ClientOptions';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import * as Input from '@dxos/react-ui/Input';
import * as Select from '@dxos/react-ui/Select';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Theme from '@dxos/react-ui/Theme';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';
import { type ThemeMode } from '@dxos/ui-types';

import * as StoryLayout from '../StoryLayout.ts';
import * as StoryPeers from '../StoryPeers.ts';
import * as StorySnapshot from '../StorySnapshot.ts';
import { type ModuleLayout } from './module-container.tsx';
import { StorySpaceProvider } from './story-space.ts';

type LazyPluginsResult = {
  plugins: Plugin.Plugin[];
  types?: any[];
};

/** What `onInit` gets: the space to seed, on the client that seeds it. */
export type InitProps = {
  client: Client;
  space: Space;
  /** Runs a sample-space partial once per space, so content several stories share is written once. */
  run: <A>(partial: SampleSpace.Partial<A>) => Promise<A>;
};

/** A layout a peer can switch to. */
export type View = { label?: string; layout: ModuleLayout };

/** Named layouts, and the one each peer opens; the count of `open` is how many peers show at first. */
export type Views = { views: Record<string, View>; open: readonly string[] };

export type Init = ModuleLayout | Views;

export type Options = {
  /** Shown in the peer frame's toolbar. */
  title?: string;
  /** Peers sharing one space; above one, each runs the story in its own client and the harness frames them. */
  peers?: number;
  plugins?: Plugin.Plugin[];
  /** Import heavy plugins on story mount instead of at module load. */
  lazyPlugins?: () => Promise<LazyPluginsResult>;
  accessTokens?: AccessToken.AccessToken[];
  /** Import a `.dx.json` space archive instead of creating an empty space; one peer only. */
  importSnapshot?: () => Promise<unknown>;
  /** Seed the space; a returned layout is published via {@link StoryLayout.Atom}. */
  onInit?: (props: InitProps) => Promise<Init | void>;
  /** Forwarded to `useApp` so plugins contribute setup-gated capabilities (e.g. settings). */
  setupEvents?: WithPluginManagerOptions['setupEvents'];
  /** Rendered inside the plugin-manager context, wrapping the story (e.g. a chat-context binder). */
  Wrapper?: FC<PropsWithChildren>;
} & Omit<ClientOptions.ClientPluginOptions, 'onClientInitialized' | 'onSpacesAvailable'>;

/** Options, or a function of the story context that gives seeding code the story's `args`. */
export type DecoratorsInput<Args = any> = Options | ((context: { args: Args }) => Options);

type StoryContext<Args> = { id: string; args: Args; globals?: Record<string, any> };

const isViews = (init: Init): init is Views => !Array.isArray(init);

const firstLayout = (init: Init | void): ModuleLayout | undefined =>
  !init ? undefined : isViews(init) ? init.views[init.open[0]]?.layout : init;

/** Contributes the atom `ModuleContainer.Root` reads, and publishes a layout `onInit` built during client init. */
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
    // The layout references space objects, so it is publishable only once the client observes the space.
    activatesOn: ClientEvents.SpacesAvailable,
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

/** Runs each partial once per space on a client the harness owns. */
const makeRun = (client: Client, space: Space): InitProps['run'] => {
  const runs = new Map<string, Promise<unknown>>();
  return <A,>(partial: SampleSpace.Partial<A>) => {
    let result = runs.get(partial.name);
    if (!result) {
      result = client.addTypes([...partial.schemas]).then(() => StoryPeers.runPartial(partial, space));
      runs.set(partial.name, result);
    }
    // Keyed by partial name, so the stored run is this partial's, whose result the map cannot type.
    return result as Promise<A>;
  };
};

//
// One client.
//

/**
 * Builds the plugin-manager options: core plugins, the client (with identity init, optional snapshot import, access
 * tokens, and the `onInit` seeding hook), the storybook plugin, and the runtime-layout publication.
 */
const buildStoryPluginOptions = ({
  types = [],
  plugins,
  accessTokens = [],
  importSnapshot,
  onInit,
  setupEvents,
  config,
  title: _title,
  peers: _peers,
  Wrapper: _Wrapper,
  ...props
}: Omit<Options, 'lazyPlugins'>): WithPluginManagerOptions => {
  // A config flagging `storage.persistent` needs the dedicated/coordinator worker pair; every other config stays a
  // plain ephemeral client.
  const clientServices = config?.values.runtime?.client?.storage?.persistent
    ? persistentClientServices(config)
    : { config };

  // `onInit` fills the holder during client init; the layout plugin publishes it on SpacesAvailable.
  const layoutHolder: { current?: ModuleLayout } = {};
  const layoutAtom = Atom.make<ModuleLayout | undefined>(undefined);
  const init = (client: Client, space: Space) =>
    Effect.promise(async () => {
      layoutHolder.current = firstLayout(await onInit?.({ client, space, run: makeRun(client, space) }));
    });

  return {
    setupEvents,
    plugins: [
      ...CorePlugins.make(),
      ClientPlugin.make({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            // Abort if already initialized.
            if (client.halo.identity.get()) {
              return;
            }

            if (importSnapshot) {
              yield* StorySnapshot.initClient(importSnapshot)({ client });
              const [space] = client.spaces.get();
              invariant(space, 'No space available after snapshot import.');
              for (const accessToken of accessTokens) {
                space.db.add(Obj.clone(accessToken));
              }
              yield* init(client, space);
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
              return;
            }

            const { defaultSpace: space } = yield* initializeIdentity(client);
            for (const accessToken of accessTokens) {
              space.db.add(Obj.clone(accessToken));
            }
            yield* Effect.promise(() => space.db.flush({ indexes: true }));
            yield* init(client, space);
            yield* Effect.promise(() => space.db.flush({ indexes: true }));
          }),
        ...clientServices,
        ...props,
      }),
      StorybookPlugin.make({}),
      StoryLayoutPlugin({ layoutAtom, layoutHolder }),
      ...(plugins ?? []),
    ],
  };
};

/** Creates the plugin manager and renders the app. */
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

    // `useApp` contributes these too, but from an effect that runs after this component's own, which starts
    // activation; a module requiring `AtomRegistry` would find no provider. Contribute at construction instead.
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

  // The ReactRoot contribution tracks `children` (recreated per render), but shutdown must not: tearing the manager
  // down from a re-render's cleanup would leave the mounted story running against a dead manager.
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
    // A story mounts one surface, so no demand reaches the modules gated behind it.
    EffectEx.runDetached(activateDemandGatedModules(manager));

    return () => {
      void EffectEx.runAndForwardErrors(manager.shutdown());
    };
  }, [manager]);

  const App = Hooks.useApp({ pluginManager: manager, setupEvents: options.setupEvents });
  return <App />;
};

const SingleHost = ({ props, contextId, Story }: { props: Options; contextId: string; Story: FC }) => {
  // Non-lazy stories start with options ready; lazy stories wait.
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
            plugins: [...(props.plugins ?? []), ...lazyResult.plugins],
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
    <PluginManagerHost options={options} contextId={contextId}>
      {Wrapper ? (
        <Wrapper>
          <Story />
        </Wrapper>
      ) : (
        <Story />
      )}
    </PluginManagerHost>
  );
};

//
// Several peers.
//

type PeersHostProps = {
  props: Options;
  shared?: StoryPeers.Shared;
  contextId: string;
  themeMode: ThemeMode;
  Story: FC;
};

/**
 * Runs the story once per peer, each in a plugin app of its own over its peer's client, with a toolbar to show one
 * or every peer. Peers stay mounted while hidden: their plugin apps own their clients and would destroy them.
 */
const PeersHost = ({ props, shared, contextId, themeMode, Story }: PeersHostProps) => {
  const [own] = useState(() =>
    shared ? undefined : StoryPeers.make({ title: props.title ?? contextId, count: props.peers }),
  );
  const runtime = shared?.runtime ?? own;
  invariant(runtime);
  const state = useSyncExternalStore(runtime.subscribe, runtime.getState);

  const [lazy, setLazy] = useState<LazyPluginsResult | null>(props.lazyPlugins ? null : { plugins: [] });
  useEffect(() => {
    if (props.lazyPlugins) {
      void props.lazyPlugins().then(setLazy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [init, setInit] = useState<Init>();
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!lazy) {
      return;
    }
    runtime
      .seed(
        `story:${contextId}`,
        async ({ client, space }) => {
          await runtime.addTypes([...(props.types ?? []), ...(lazy.types ?? [])]);
          for (const accessToken of props.accessTokens ?? []) {
            space.db.add(Obj.clone(accessToken));
          }
          return (await props.onInit?.({ client, space, run: (partial) => runtime.run(partial) })) || undefined;
        },
        { late: shared?.late },
      )
      .then(
        (init) => {
          setInit(init);
          setSeeded(true);
        },
        (error) => setError(String(error)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, contextId, lazy]);

  const views = init && isViews(init) ? init : undefined;
  const opened = views?.open.length ?? props.peers ?? 1;
  const [count, setCount] = useState<'one' | 'all'>();
  const shown = count ?? (opened > 1 ? 'all' : 'one');
  const [selected, setSelected] = useState<Record<number, string>>({});
  const viewOf = (index: number) => selected[index] ?? views?.open[index] ?? views?.open[0];
  const layoutOf = (index: number): ModuleLayout | undefined => {
    if (!init) {
      return undefined;
    }
    if (!isViews(init)) {
      return init;
    }
    const view = viewOf(index);
    return view ? init.views[view]?.layout : undefined;
  };

  const message = error ?? state.error;
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={themeMode}>
      <div className='fixed inset-0 grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-base-surface'>
        <Toolbar.Root>
          {props.title && <span className='px-2 font-medium'>{props.title}</span>}
          <Toolbar.Separator variant='gap' />
          {message && <span className='px-2 text-error-text truncate'>{message}</span>}
          {runtime.peers.length > 1 && (
            <Toolbar.ToggleGroup
              type='single'
              value={shown}
              onValueChange={(value: string) => value && setCount(value as 'one' | 'all')}
              aria-label='Peers shown'
            >
              <ToggleGroup.Item value='one' icon='ph--square--regular' label='One peer' iconOnly />
              <ToggleGroup.Item value='all' icon='ph--columns--regular' label='Every peer' iconOnly />
            </Toolbar.ToggleGroup>
          )}
        </Toolbar.Root>
        <div
          className='grid min-h-0 gap-px bg-separator'
          style={{ gridTemplateColumns: `repeat(${shown === 'all' ? runtime.peers.length : 1}, minmax(0, 1fr))` }}
        >
          {runtime.peers.map((peer, index) => {
            const hidden = shown === 'one' && index > 0;
            return (
              <div
                key={peer.name}
                className={mx(
                  'grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-base-surface',
                  hidden && 'hidden',
                )}
                inert={hidden}
              >
                <PeerBar
                  peer={peer}
                  views={views}
                  view={viewOf(index)}
                  onViewChange={(view) => setSelected((selected) => ({ ...selected, [index]: view }))}
                  online={state.online[index]}
                  onOnlineChange={(online) => runtime.setOnline(index, online)}
                />
                {/* Story layouts are `fixed inset-0`; layout containment confines each peer's app to its pane. */}
                <div className='relative overflow-hidden contain-layout'>
                  {lazy && (
                    <PeerApp
                      id={`${contextId}-${index}`}
                      client={runtime.clients[index]}
                      plugins={[...(props.plugins ?? []), ...lazy.plugins]}
                      setupEvents={props.setupEvents}
                      spaceId={state.spaceId}
                      layout={layoutOf(index)}
                      ready={seeded && state.joined[index]}
                      Wrapper={props.Wrapper}
                      Story={Story}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Theme.Provider>
  );
};

type PeerBarProps = {
  peer: StoryPeers.Peer;
  views?: Views;
  view?: string;
  onViewChange: (view: string) => void;
  online: boolean;
  onOnlineChange: (online: boolean) => void;
};

const PeerBar = ({ peer, views, view, onViewChange, online, onOnlineChange }: PeerBarProps) => {
  const items = Object.entries(views?.views ?? {}).map(([value, { label }]) => ({ value, label: label ?? value }));
  return (
    <div
      className='flex items-center gap-2 px-3 py-1 text-sm border-b border-separator'
      style={{ borderTop: `3px solid var(--color-${peer.hue}-border)` }}
    >
      <span className='inline-block size-2.5 rounded-full' style={{ background: `var(--color-${peer.hue}-border)` }} />
      <span className='font-medium'>{peer.name}</span>
      {items.length > 1 && view && (
        <Select.Root items={items} value={[view]} onValueChange={({ value }) => value[0] && onViewChange(value[0])}>
          <Select.Trigger aria-label='View' fixed classNames='w-auto' />
          <Select.Content>
            {items.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
      )}
      <span className='ms-auto' />
      <Input.Switch
        classNames='text-sm'
        label={online ? 'Online' : 'Offline'}
        checked={online}
        onCheckedChange={({ checked }) => onOnlineChange(checked)}
      />
    </div>
  );
};

type PeerAppProps = {
  id: string;
  client: Client;
  plugins: Plugin.Plugin[];
  setupEvents?: WithPluginManagerOptions['setupEvents'];
  spaceId?: SpaceId;
  layout?: ModuleLayout;
  /** Whether the peer has the space and the story its layout; until then the app boots behind a placeholder. */
  ready: boolean;
  Wrapper?: FC<PropsWithChildren>;
  Story: FC;
};

const PeerApp = ({ id, client, plugins, setupEvents, spaceId, layout, ready, Wrapper, Story }: PeerAppProps) => {
  const [layoutAtom] = useState(() => Atom.make<ModuleLayout | undefined>(undefined));
  const options = useMemo<WithPluginManagerOptions>(
    () => ({
      setupEvents,
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({ client }),
        StorybookPlugin.make({}),
        StoryLayoutPlugin({ layoutAtom, layoutHolder: {} }),
        ...plugins,
      ],
    }),
    // A new manager per render would never settle; the plugins are rebuilt only with the client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client],
  );

  return (
    <AppPluginManagerHost id={id} options={options}>
      <StorySpaceProvider value={spaceId}>
        <PublishLayout atom={layoutAtom} layout={layout} />
        {!ready ? (
          <div className='absolute inset-0 grid place-items-center text-description'>Connecting…</div>
        ) : Wrapper ? (
          <Wrapper>
            <Story />
          </Wrapper>
        ) : (
          <Story />
        )}
      </StorySpaceProvider>
    </AppPluginManagerHost>
  );
};

const PublishLayout = ({ atom, layout }: { atom: Atom.Writable<ModuleLayout | undefined>; layout?: ModuleLayout }) => {
  const registry = Hooks.useCapability(Capabilities.AtomRegistry);
  useEffect(() => {
    registry.set(atom, layout);
  }, [registry, atom, layout]);
  return null;
};

//
// Decorators.
//

/**
 * Story decorators: theme, fullscreen layout and the plugin-manager harness. A story with `peers` above one, or any
 * story inside a {@link StoryPeers.Provider}, runs once per peer over a shared space.
 */
export const decorators = <Args = any,>(input: DecoratorsInput<Args> = {}) => {
  // Storybook's decorator type is keyed to its renderer's args, which a factory generic over `Args` cannot name.
  const host = ((Story: FC, context: StoryContext<Args>) => {
    // The function form re-resolves when args change: a Controls edit reboots the whole harness, which is correct
    // since the seeded space depends on them.
    const props = useMemo(
      () => (typeof input === 'function' ? input({ args: context.args }) : input),
      // `input` is stable per `decorators` call.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [context.args],
    );
    const shared = StoryPeers.useShared();

    if (shared || (props.peers ?? 1) > 1) {
      return (
        <PeersHost
          props={props}
          shared={shared}
          contextId={context.id}
          // Storybook types globals as a record of unknowns; `theme` is the toolbar's theme mode.
          themeMode={(context.globals?.theme as ThemeMode) || 'dark'}
          Story={Story}
        />
      );
    }

    return <SingleHost props={props} contextId={context.id} Story={Story} />;
  }) as any;

  return [withTheme(), withLayout({ layout: 'fullscreen' }), host];
};
