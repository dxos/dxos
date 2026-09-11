//
// Copyright 2026 DXOS.org
//

import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import type * as PluginManager from '@dxos/app-framework/PluginManager';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import { EffectEx } from '@dxos/effect';

/** One namespace's two-way link between a local value and the synced store. */
export type Binding = {
  namespace: string;
  /** The values in effect locally right now. */
  read: () => AppSettings.Values;
  /** Put resolved values into effect locally. */
  write: (values: AppSettings.Values) => void;
  /** Report local edits, returning an unsubscribe. Omit where the local side cannot notify. */
  subscribe?: (onChange: () => void) => () => void;
  /**
   * Whether `read` reports only part of the namespace, so a key it omits is one this device has no
   * opinion about rather than one that was removed.
   */
  sparse?: boolean;
};

/** One plugin's contributed settings atom. */
export const pluginSettings = (entry: AppCapabilities.Settings, registry: AtomRegistry.AtomRegistry): Binding => ({
  namespace: entry.prefix,
  read: () => registry.get(entry.atom),
  write: (values) => registry.set(entry.atom, values),
  subscribe: (onChange) => registry.subscribe(entry.atom, onChange),
});

/**
 * Which plugins are enabled, keyed by plugin id.
 *
 * Core plugins are left out: the host force-enables them, so they are not the user's to toggle.
 */
export const pluginSet = (manager: PluginManager.PluginManager, registry: AtomRegistry.AtomRegistry): Binding => {
  const toggleable = () =>
    manager
      .getPlugins()
      .map((plugin) => plugin.meta.profile.key)
      .filter((id) => !manager.getCore().includes(id));

  return {
    namespace: AppSettings.PLUGINS_NAMESPACE,
    // Only plugins registered here are reported, and the account carries decisions about plugins
    // that are not.
    sparse: true,
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
    // `plugins` as well as `enabled`, so a newly registered plugin gets a decision recorded rather
    // than waiting for the next unrelated toggle.
    subscribe: (onChange) => {
      const unsubscribe = [
        registry.subscribe(manager.enabled, onChange),
        registry.subscribe(manager.plugins, onChange),
      ];
      return () => unsubscribe.forEach((fn) => fn());
    },
  };
};

/**
 * Plugins installed from a URL, keyed by plugin id.
 *
 * No `subscribe`: `UrlLoader`'s store has no change notification, and an install goes through a full
 * reload anyway, so this direction is pull-only.
 */
export const installedPlugins = (): Binding => ({
  namespace: AppSettings.INSTALLED_NAMESPACE,
  read: () => Object.fromEntries(UrlLoader.getRemoteEntries().map((entry) => [entry.id, entry])),
  write: (entries) => {
    UrlLoader.setRemoteEntries(Object.values(entries).filter(AppSettings.isInstalledPlugin));
  },
});
