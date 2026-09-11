//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { Database, Obj } from '@dxos/echo';
import { createKvsStore } from '@dxos/effect';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { resolveSettingsSpace } from '../../util/index.ts';
import { installedPlugins, pluginSet, pluginSettings } from './binding.ts';
import { type Store } from './reconciler.ts';
import { Sync } from './sync.ts';

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
 * the settings space, so they follow the identity across devices with per-key device pins.
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
    const settings = yield* AppSettings.open().pipe(Effect.provide(Database.layer(space.db)));
    // This device's pins. One per device, so the key names no device.
    const device = createKvsStore({
      key: 'org.dxos.app-toolkit.settings-scope',
      schema: AppSettings.DeviceSettings,
      defaultValue: AppSettings.makeDeviceSettings,
    });
    const store = makeStore(settings, device, registry);
    const sync = new Sync(store);

    //
    // Bindings. Plugin settings arrive over the session as plugins lazily activate, so that set
    // follows the capability list; the other two exist from the start.
    //

    const bound = new Set<string>();
    const bindSettings = (entries: readonly AppCapabilities.Settings[]) => {
      for (const entry of entries.filter((entry) => !bound.has(entry.prefix))) {
        bound.add(entry.prefix);
        sync.bind(pluginSettings(entry, registry));
      }
    };

    const contributed = manager.capabilities.atom(AppCapabilities.Settings);
    bindSettings(registry.get(contributed));
    sync.bind(pluginSet(manager, registry));
    sync.bind(installedPlugins());

    //
    // Republish on any change, from either half of the store.
    //

    // Copied out: the atom compares by identity, and the stored value keeps its identity across a write.
    const readUnsynced = () => [...AppSettings.getUnsynced(store.read())];
    const readPinned = () => structuredClone(store.read().local);
    const unsynced = Atom.make<readonly string[]>(readUnsynced()).pipe(Atom.keepAlive);
    const pinned = Atom.make<AppSettings.DeviceSettings>(readPinned()).pipe(Atom.keepAlive);

    const refresh = () => {
      registry.set(unsynced, readUnsynced());
      registry.set(pinned, readPinned());
      sync.pull();
    };

    const unsubscribe = [
      registry.subscribe(contributed, bindSettings),
      Obj.subscribe(settings, refresh),
      registry.subscribe(device, refresh),
    ];

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe.forEach((fn) => fn());
        sync.dispose();
      }),
    );

    return Capability.contribute(AppCapabilities.SettingsSync, {
      unsynced,
      pinned,
      takeLocal: (namespace) => {
        const freeze = sync.freezes(namespace);
        store.update((draft) => AppSettings.takeLocal(draft, namespace, sync.local(namespace), { freeze }));
      },
      rejoinAccount: (namespace, options) => {
        store.update((draft) => AppSettings.rejoinAccount(draft, namespace, sync.local(namespace), options));
      },
      conflicts: (namespace) => AppSettings.conflictingKeys(store.read(), namespace, sync.local(namespace)),
      pinKey: (namespace, key) => {
        store.update((draft) => AppSettings.pinKey(draft, namespace, key));
      },
      unpinKey: (namespace, key) => {
        store.update((draft) => AppSettings.unpinKey(draft, namespace, key));
      },
    });
  }),
);
