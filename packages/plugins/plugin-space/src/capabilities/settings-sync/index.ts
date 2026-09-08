//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { resolveSettingsSpace } from '../../util';
import { type Binding, Reconciler } from './binding';
import { getOrCreateSettings, makeDeviceStore, makeStore } from './store';

/**
 * Binds every settings surface the app already has — each plugin's settings atom, the enabled
 * plugin set, and the remote plugin install list — to the {@link AppSettings.AppSettings} object in
 * the settings space, so they follow the identity across devices with per-key device overrides.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const manager = yield* Capabilities.PluginManager;
    const registry = yield* Capabilities.AtomRegistry;

    if (!client.halo.identity.get()) {
      log.warn('no identity; settings will not sync');
      return [];
    }

    const space = yield* resolveSettingsSpace(client);
    const settings = yield* getOrCreateSettings(space);
    const deviceStore = makeDeviceStore();
    const store = makeStore(settings, deviceStore, registry);

    // Copied out: the atom compares by identity, and the stored value keeps its identity across a write.
    const readUnsynced = () => [...AppSettings.getUnsynced(store.read())];
    const unsynced = Atom.make<readonly string[]>(readUnsynced()).pipe(Atom.keepAlive);
    const readPinned = () => structuredClone(store.read().local);
    const pinned = Atom.make<AppSettings.DeviceSettings>(readPinned()).pipe(Atom.keepAlive);

    const reconcilers: Reconciler[] = [];
    const subscriptions: (() => void)[] = [];

    /** Start reconciling one namespace, seeding it before either direction can fire. */
    const bind = (binding: Binding, subscribe: (onChange: () => void) => () => void) => {
      const reconciler = new Reconciler(store, binding);
      reconciler.seed();
      reconcilers.push(reconciler);
      subscriptions.push(subscribe(() => reconciler.push()));
    };

    // Contributions arrive over time as plugins lazily activate, so this follows the capability list.
    const bound = new Set<string>();
    const bindSettings = (entries: readonly AppCapabilities.Settings[]) => {
      for (const entry of entries) {
        if (bound.has(entry.prefix)) {
          continue;
        }

        bound.add(entry.prefix);
        bind(
          {
            namespace: entry.prefix,
            read: () => registry.get(entry.atom),
            write: (values) => registry.set(entry.atom, values),
          },
          (onChange) => registry.subscribe(entry.atom, onChange),
        );
      }
    };

    const settingsAtom = manager.capabilities.atom(AppCapabilities.Settings);
    bindSettings(registry.get(settingsAtom));
    subscriptions.push(registry.subscribe(settingsAtom, bindSettings));

    // Core plugins are force-enabled by the host and are not the user's to toggle.
    const toggleable = () =>
      manager
        .getPlugins()
        .map((plugin) => plugin.meta.profile.key)
        .filter((id) => !manager.getCore().includes(id));

    bind(
      {
        namespace: AppSettings.PLUGINS_NAMESPACE,
        read: () => {
          const enabled = manager.getEnabled();
          return Object.fromEntries(toggleable().map((id) => [id, enabled.includes(id)]));
        },
        write: (decisions) => {
          const target = new Set(AppSettings.getEnabledPlugins(decisions));
          const current = manager.getEnabled();
          for (const id of toggleable()) {
            // An id with no decision is one no device has an opinion about yet.
            if (!(id in decisions) || target.has(id) === current.includes(id)) {
              continue;
            }

            void EffectEx.runAndForwardErrors(target.has(id) ? manager.enable(id) : manager.disable(id));
          }
        },
      },
      (onChange) => {
        const unsubscribe = [
          registry.subscribe(manager.enabled, onChange),
          registry.subscribe(manager.plugins, onChange),
        ];
        return () => unsubscribe.forEach((fn) => fn());
      },
    );

    bind(
      {
        namespace: AppSettings.INSTALLED_NAMESPACE,
        read: () => Object.fromEntries(UrlLoader.getRemoteEntries().map((entry) => [entry.id, entry])),
        write: (entries) => {
          UrlLoader.setRemoteEntries(
            Object.values(entries).filter((entry): entry is AppSettings.InstalledPlugin => !!entry?.url),
          );
        },
      },
      // `UrlLoader`'s store has no change notification, so this direction is pull-only.
      () => () => {},
    );

    const refresh = () => {
      registry.set(unsynced, readUnsynced());
      registry.set(pinned, readPinned());
      for (const reconciler of reconcilers) {
        reconciler.pull();
      }
    };
    subscriptions.push(Obj.subscribe(settings, refresh));
    subscriptions.push(registry.subscribe(deviceStore, refresh));

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        subscriptions.forEach((unsubscribe) => unsubscribe());
      }),
    );

    const localValues = (namespace: string): AppSettings.Values =>
      reconcilers.find((reconciler) => reconciler.namespace === namespace)?.local() ?? {};

    return Capability.contribute(AppCapabilities.SettingsSync, {
      unsynced,
      pinned,
      setSynced: (namespace, synced, options) => {
        // Leaving the plugin set deliberately pins nothing, so plugins enabled on another device
        // later still arrive here.
        const freeze = namespace !== AppSettings.PLUGINS_NAMESPACE;
        store.update((draft) =>
          AppSettings.setSynced(draft, namespace, synced, localValues(namespace), { freeze, adopt: options?.adopt }),
        );
      },
      conflicts: (namespace) => AppSettings.conflictingKeys(store.read(), namespace, localValues(namespace)),
      setKeySynced: (namespace, key, synced) => {
        store.update((draft) => AppSettings.setKeySynced(draft, namespace, key, synced));
      },
    });
  }),
);
