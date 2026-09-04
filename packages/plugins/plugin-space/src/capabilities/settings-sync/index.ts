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
import { getOrCreateSettings, makeStore } from './store';

/**
 * Binds every settings surface the app already has — each plugin's settings atom, the enabled
 * plugin set, and the remote plugin install list — to the {@link AppSettings.AppSettings} object in
 * the settings space, so they follow the identity across devices with per-key device overrides.
 *
 * Nothing plugin-side changes: the atoms stay `localStorage`-backed, which makes local storage the
 * boot cache the app renders from before the space opens.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const manager = yield* Capabilities.PluginManager;
    const registry = yield* Capabilities.AtomRegistry;

    const device = client.halo.device;
    if (!device) {
      log.warn('no device identity; settings will not sync');
      return [];
    }

    const deviceKey = device.deviceKey.toHex();
    const space = yield* resolveSettingsSpace(client);
    const settings = yield* getOrCreateSettings(space);
    const store = makeStore(settings);

    const label = device.profile?.label;
    if (label) {
      store.update((draft) => AppSettings.setDeviceLabel(draft, deviceKey, label));
    }

    // Copied out of ECHO rather than handed over live: the array proxy keeps its identity across a
    // reassignment, and the atom compares by identity, so a live value would never notify.
    const readUnsynced = () => [...AppSettings.getUnsynced(settings, deviceKey)];
    const unsynced = Atom.make<readonly string[]>(readUnsynced()).pipe(Atom.keepAlive);

    const reconcilers: Reconciler[] = [];
    const subscriptions: (() => void)[] = [];

    /** Start reconciling one namespace, seeding it before either direction can fire. */
    const bind = (binding: Binding, subscribe: (onChange: () => void) => () => void) => {
      const reconciler = new Reconciler(store, deviceKey, binding);
      reconciler.seed();
      reconcilers.push(reconciler);
      subscriptions.push(subscribe(() => reconciler.push()));
    };

    //
    // Plugin settings. Contributions arrive over time as plugins lazily activate, so this follows
    // the capability list rather than taking a snapshot of it.
    //

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

    //
    // Plugin set. Keyed by plugin id so a device override affects one plugin rather than replacing
    // the list — see `AppSettings.PLUGINS_NAMESPACE`. Core plugins are excluded: they are
    // force-enabled by the host and are not the user's to toggle.
    //

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
            // An id with no decision is one no device has an opinion about yet — leave it alone
            // rather than reading the missing entry as "disabled".
            if (!(id in decisions) || target.has(id) === current.includes(id)) {
              continue;
            }

            void EffectEx.runAndForwardErrors(target.has(id) ? manager.enable(id) : manager.disable(id));
          }
        },
      },
      // Both atoms: `enabled` for the user's toggles, `plugins` so a newly registered plugin gets a
      // decision recorded rather than waiting for the next unrelated toggle.
      (onChange) => {
        const unsubscribe = [
          registry.subscribe(manager.enabled, onChange),
          registry.subscribe(manager.plugins, onChange),
        ];
        return () => unsubscribe.forEach((fn) => fn());
      },
    );

    //
    // Remote plugin installs. Read during preload, before the client exists, so this can only write
    // them through to the loader's local store; they take effect on the next reload.
    //

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
      // The loader's store is plain `localStorage` with no change notification, and installs go
      // through a full reload anyway, so this direction is pull-only.
      () => () => {},
    );

    subscriptions.push(
      Obj.subscribe(settings, () => {
        registry.set(unsynced, readUnsynced());
        for (const reconciler of reconcilers) {
          reconciler.pull();
        }
      }),
    );

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        subscriptions.forEach((unsubscribe) => unsubscribe());
      }),
    );

    return Capability.contribute(AppCapabilities.SettingsSync, {
      deviceKey,
      unsynced,
      setSynced: (namespace, synced, options) => {
        // Whether unsyncing freezes the current values is a property of the namespace, not of the
        // UI: a plugin's settings freeze so the switch is visibly a no-op, while the plugin set
        // deliberately does not, so plugins enabled on another device later still arrive here.
        // Snapshots come from the reconciler — only it knows the value in effect for a key that is
        // still on its schema default and therefore absent from ECHO.
        const snapshot =
          synced || namespace === AppSettings.PLUGINS_NAMESPACE
            ? undefined
            : reconcilers.find((reconciler) => reconciler.namespace === namespace)?.current();
        store.update((draft) =>
          AppSettings.setSynced(draft, deviceKey, namespace, synced, { snapshot, adopt: options?.adopt }),
        );
      },
      conflicts: (namespace) => AppSettings.conflictingKeys(settings, deviceKey, namespace),
    });
  }),
);
