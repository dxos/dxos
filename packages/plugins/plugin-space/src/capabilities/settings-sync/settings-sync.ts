//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { EffectEx, createKvsStore } from '@dxos/effect';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { resolveSettingsSpace } from '../../util';
import { type Binding, Reconciler, type Store } from './binding';

/**
 * The space's {@link AppSettings.AppSettings} singleton, created on first use. Two devices racing
 * first use create two objects; the lowest id wins so every device converges on the same one.
 */
const getOrCreateSettings = Effect.fnUntraced(function* (space: Space) {
  const existing = yield* Effect.promise(() => space.db.query(Filter.type(AppSettings.AppSettings)).run());
  const canonical = [...existing].sort((left, right) => left.id.localeCompare(right.id))[0];
  return canonical ?? space.db.add(AppSettings.make());
});

/**
 * Adapt the two halves to the reconciler's storage interface: the shared layer in ECHO, this
 * device's pins in local storage. A write opens both, since only {@link AppSettings.setValue} knows
 * whether an edit reaches the account.
 */
const makeStore = (
  settings: AppSettings.AppSettings,
  device: Atom.Writable<AppSettings.DeviceSettings>,
  registry: AtomRegistry.AtomRegistry,
): Store => ({
  read: () => ({ shared: settings.shared, local: registry.get(device) }),
  update: (fn) => {
    const before = registry.get(device);
    const local: AppSettings.DeviceSettings = structuredClone(before);
    Obj.update(settings, (settings) => fn({ shared: settings.shared, local }));
    if (JSON.stringify(local) !== JSON.stringify(before)) {
      registry.set(device, local);
    }
  },
});

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
    // This device's pins. One per device, so the key names no device.
    const deviceStore = createKvsStore({
      key: 'org.dxos.app-toolkit.settings-scope',
      schema: AppSettings.DeviceSettings,
      defaultValue: AppSettings.makeDeviceSettings,
    });
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
