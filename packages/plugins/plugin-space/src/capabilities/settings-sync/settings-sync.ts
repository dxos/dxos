//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { type Client } from '@dxos/client';
import { Annotation, Obj } from '@dxos/echo';
import * as KvsStore from '@dxos/effect/KvsStore';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { catchNonInterrupt, resolveAppSettings, resolveSettingsSpace } from '../../util/index.ts';
import { installedPlugins, pluginSet, pluginSettings } from './binding.ts';
import { type Store } from './reconciler.ts';
import { Sync } from './sync.ts';

/**
 * Adapt the two halves to the reconciler's storage interface: the shared layer in ECHO, this
 * device's pins in local storage. A write opens both, since only {@link AppSettings.setValue} knows
 * whether an edit reaches the account.
 */
const makeStore = (
  current: () => AppSettings.AppSettings,
  device: Atom.Writable<AppSettings.DeviceSettings>,
  registry: AtomRegistry.AtomRegistry,
): Store => ({
  read: () => ({ shared: current().shared, local: registry.get(device) }),
  update: (fn) => {
    const before = registry.get(device);
    const local: AppSettings.DeviceSettings = structuredClone(before);
    const settings = current();
    Obj.update(settings, (settings) => fn({ shared: settings.shared, local }));
    if (JSON.stringify(local) !== JSON.stringify(before)) {
      registry.set(device, local);
    }
  },
});

/**
 * Resolve once the client has an identity. The space list can be observable before the identity
 * loads (existing profile, device join, recovery), and only `CreateIdentity` re-fires
 * `IdentityCreated`, so the module cannot rely on activation order to see it.
 */
const awaitIdentity = (client: Client) =>
  Effect.callback<void>((resume) => {
    if (client.halo.identity.get()) {
      resume(Effect.void);
      return;
    }
    const subscription = client.halo.identity.subscribe((identity) => {
      if (identity) {
        resume(Effect.void);
      }
    });
    return Effect.sync(() => subscription.unsubscribe());
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

    // This device's pins. One per device, so the key names no device.
    const device = KvsStore.make({
      key: 'org.dxos.app-toolkit.settings-scope',
      schema: AppSettings.DeviceSettings,
      defaultValue: AppSettings.makeDeviceSettings,
    });

    // Copied out: the atom compares by identity, and the stored value keeps its identity across a write.
    const ready = Atom.make(false).pipe(Atom.keepAlive);
    const unsynced = Atom.make<readonly string[]>([]).pipe(Atom.keepAlive);
    const pinned = Atom.make<AppSettings.DeviceSettings>(structuredClone(registry.get(device))).pipe(Atom.keepAlive);

    let bound: { store: Store; sync: Sync } | undefined;
    const unsubscribe: (() => void)[] = [];

    const bind = Effect.gen(function* () {
      yield* awaitIdentity(client);
      const space = yield* resolveSettingsSpace(client);
      let settings = yield* resolveAppSettings(space);
      const store = makeStore(() => settings, device, registry);
      const sync = new Sync(store);

      //
      // Bindings. Plugin settings arrive over the session as plugins lazily activate, so that set
      // follows the capability list; the other two exist from the start.
      //

      const boundPrefixes = new Set<string>();
      const bindSettings = (entries: readonly AppCapabilities.Settings[]) => {
        for (const entry of entries.filter((entry) => !boundPrefixes.has(entry.prefix))) {
          boundPrefixes.add(entry.prefix);
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

      const refresh = () => {
        registry.set(unsynced, [...AppSettings.getUnsynced(store.read())]);
        registry.set(pinned, structuredClone(store.read().local));
        sync.pull();
      };

      //
      // Follow the annotation. Devices that each created an object settle on the one it names, so a
      // device switches to it and reseeds, republishing what only it holds.
      //

      const follow = () => {
        const ref = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(Option.getOrUndefined);
        void ref?.load().then(
          (next) => {
            const named = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(
              Option.getOrUndefined,
            );
            if (next.id === settings.id || named?.uri !== ref.uri) {
              return;
            }

            unsubscribeSettings();
            settings = next;
            unsubscribeSettings = Obj.subscribe(settings, onSettingsChange);
            sync.seed();
            refresh();
          },
          (error) => log.catch(error),
        );
      };

      const onSettingsChange = () => (Obj.isDeleted(settings) ? follow() : refresh());
      let unsubscribeSettings = Obj.subscribe(settings, onSettingsChange);

      unsubscribe.push(
        registry.subscribe(contributed, bindSettings),
        Obj.subscribe(space.properties, follow),
        registry.subscribe(device, refresh),
        () => unsubscribeSettings(),
      );
      bound = { store, sync };
      registry.set(ready, true);
      refresh();
    });

    const bindFiber = Effect.runFork(
      Effect.gen(function* () {
        while (!bound) {
          yield* bind.pipe(catchNonInterrupt('settings sync bootstrap failed, retrying'));
          if (!bound) {
            yield* Effect.sleep('1 second');
          }
        }
      }),
    );

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Fiber.interrupt(bindFiber);
        unsubscribe.forEach((fn) => fn());
        bound?.sync.dispose();
      }),
    );

    const whenBound = (action: string, fn: (bound: { store: Store; sync: Sync }) => void) => {
      if (!bound) {
        log.warn('settings sync not ready', { action });
        return;
      }
      fn(bound);
    };

    return Capability.contribute(AppCapabilities.SettingsSync, {
      ready,
      unsynced,
      pinned,
      takeLocal: (namespace) =>
        whenBound('takeLocal', ({ store, sync }) => {
          const freeze = sync.freezes(namespace);
          store.update((draft) => AppSettings.takeLocal(draft, namespace, sync.local(namespace), { freeze }));
        }),
      rejoinAccount: (namespace, options) =>
        whenBound('rejoinAccount', ({ store, sync }) => {
          store.update((draft) => AppSettings.rejoinAccount(draft, namespace, sync.local(namespace), options));
        }),
      conflicts: (namespace) =>
        bound ? AppSettings.conflictingKeys(bound.store.read(), namespace, bound.sync.local(namespace)) : [],
      pinKey: (namespace, key) =>
        whenBound('pinKey', ({ store }) => {
          store.update((draft) => AppSettings.pinKey(draft, namespace, key));
        }),
      unpinKey: (namespace, key) =>
        whenBound('unpinKey', ({ store }) => {
          store.update((draft) => AppSettings.unpinKey(draft, namespace, key));
        }),
    });
  }),
);
