//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { type Registry as RegistryNs, Plugin, UrlLoader } from '@dxos/app-framework';
import { useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { ScrollArea, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { PluginList } from '#components';
import { getPluginPath, meta } from '#meta';

import { useAutoTags, useRegistryPlugins, useUpdateAvailableIds } from '../../hooks';

const sortEntries = (a: RegistryNs.Plugin, b: RegistryNs.Plugin) => (a.name ?? a.id).localeCompare(b.name ?? b.id);

const sortPlugins = (a: Plugin.Plugin, b: Plugin.Plugin) =>
  (a.meta.name ?? a.meta.id).localeCompare(b.meta.name ?? b.meta.id);

/**
 * Turns a registry catalog entry into a minimal Plugin object so we can reuse
 * {@link PluginList} for rendering. The synthesized plugin has no modules — it
 * exists only for display until the user installs it.
 */
const toDisplayPlugin = (plugin: RegistryNs.Plugin): Plugin.Plugin =>
  ({
    [Plugin.PluginTypeId]: Plugin.PluginTypeId,
    meta: {
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      homePage: plugin.homePage,
      source: plugin.source,
      screenshots: plugin.screenshots,
      tags: plugin.tags,
      icon: plugin.icon,
      iconHue: plugin.iconHue,
    },
    modules: [],
  }) as Plugin.Plugin;

export type RegistryProps = {
  id: string;
};

export const Registry = composable<HTMLDivElement, RegistryProps>(
  ({ id, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const manager = usePluginManager();
    const { invoke, invokePromise } = useOperationInvoker();
    const { entries, loading, error } = useRegistryPlugins();
    const enabled = useAtomValue(manager.enabled);
    const plugins = useAtomValue(manager.plugins);
    const installedIds = useMemo(() => plugins.map((plugin) => plugin.meta.id), [plugins]);
    const allSettings = useCapabilities(AppCapabilities.Settings);
    const extraTagsById = useAutoTags(entries);

    // Snapshot of installed plugin ids at mount time. Used to sort installed
    // plugins to the top without having newly-installed rows jump up mid-session.
    const [installedSnapshot] = useState<ReadonlySet<string>>(
      () => new Set(manager.getPlugins().map((plugin) => plugin.meta.id)),
    );

    const [installingIds, setInstallingIds] = useState<readonly string[]>([]);
    const [updatingIds, setUpdatingIds] = useState<readonly string[]>([]);
    const updateAvailableIds = useUpdateAvailableIds(entries);

    const sortedEntries = useMemo(() => [...entries].sort(sortEntries), [entries]);
    const moduleUrlById = useMemo(() => {
      const map: Record<string, string> = {};
      for (const entry of sortedEntries) {
        map[entry.id] = entry.moduleUrl;
      }
      return map;
    }, [sortedEntries]);

    // Maps plugin id → current registry version (i.e. plugin.version from the catalog).
    const versionById = useMemo(() => {
      const map: Record<string, string> = {};
      for (const entry of sortedEntries) {
        map[entry.id] = entry.version;
      }
      return map;
    }, [sortedEntries]);

    // Single list with installed-at-mount plugins sorted to the top. Sort order
    // is based on the mount-time snapshot so rows don't jump as the user
    // installs plugins during the session.
    const items = useMemo(() => {
      const catalogIds = new Set(sortedEntries.map((entry) => entry.id));
      const remoteIds = new Set(UrlLoader.getRemoteEntries().map((entry) => entry.id));
      const fromCatalog = sortedEntries.map(toDisplayPlugin);
      const fromUrlOnly = plugins.filter((plugin) => remoteIds.has(plugin.meta.id) && !catalogIds.has(plugin.meta.id));
      const installedFirst = [...fromCatalog, ...fromUrlOnly].sort((a, b) => {
        const aInstalled = installedSnapshot.has(a.meta.id);
        const bInstalled = installedSnapshot.has(b.meta.id);
        if (aInstalled !== bInstalled) {
          return aInstalled ? -1 : 1;
        }
        return sortPlugins(a, b);
      });
      return installedFirst;
    }, [sortedEntries, installedSnapshot, plugins]);

    const handleChange = useCallback(
      (pluginId: string, nextEnabled: boolean) =>
        Effect.gen(function* () {
          if (nextEnabled) {
            yield* manager.enable(pluginId);
          } else {
            yield* manager.disable(pluginId);
          }

          yield* invoke(ObservabilityOperation.SendEvent, {
            name: 'plugins.toggle',
            properties: { plugin: pluginId, enabled: nextEnabled, source: 'registry' },
          });
        }).pipe(runAndForwardErrors),
      [invoke, manager],
    );

    const handleInstall = useCallback(
      (pluginId: string) => {
        const moduleUrl = moduleUrlById[pluginId];
        const version = versionById[pluginId];
        if (!moduleUrl) {
          return;
        }
        setInstallingIds((prev) => (prev.includes(pluginId) ? prev : [...prev, pluginId]));
        void Effect.gen(function* () {
          const plugin = yield* manager.add(moduleUrl);
          yield* manager.enable(plugin.meta.id);
          // Persist the installed version for future update detection.
          if (version) {
            UrlLoader.setInstalledVersion(plugin.meta.id, version);
          }
          yield* invoke(ObservabilityOperation.SendEvent, {
            name: 'plugins.install',
            properties: { plugin: plugin.meta.id, source: 'registry' },
          });
        }).pipe(
          Effect.ensuring(Effect.sync(() => setInstallingIds((prev) => prev.filter((pid) => pid !== pluginId)))),
          runAndForwardErrors,
        );
      },
      [invoke, manager, moduleUrlById, versionById],
    );

    const handleUpdate = useCallback(
      (pluginId: string) => {
        const moduleUrl = moduleUrlById[pluginId];
        const version = versionById[pluginId];
        if (!moduleUrl) {
          return;
        }
        setUpdatingIds((prev) => (prev.includes(pluginId) ? prev : [...prev, pluginId]));
        void Effect.gen(function* () {
          // Unload the old version then re-install from the new URL.
          yield* manager.remove(pluginId);
          const plugin = yield* manager.add(moduleUrl);
          yield* manager.enable(plugin.meta.id);
          if (version) {
            UrlLoader.setInstalledVersion(plugin.meta.id, version);
          }
          yield* invoke(ObservabilityOperation.SendEvent, {
            name: 'plugins.update',
            properties: { plugin: plugin.meta.id, source: 'registry' },
          });
        }).pipe(
          Effect.ensuring(Effect.sync(() => setUpdatingIds((prev) => prev.filter((pid) => pid !== pluginId)))),
          runAndForwardErrors,
        );
      },
      [invoke, manager, moduleUrlById, versionById],
    );

    const handleClick = useCallback(
      (pluginId: string) =>
        invokePromise(LayoutOperation.Open, {
          subject: [getPluginPath(pluginId)],
          pivotId: id,
          positioning: 'end',
        }),
      [invokePromise, id],
    );

    const hasSettings = useCallback(
      (pluginId: string) => allSettings.some((setting) => setting.prefix === pluginId),
      [allSettings],
    );

    const handleSettings = useCallback(
      (pluginId: string) => invokePromise(SettingsOperation.Open, { plugin: pluginId }),
      [invokePromise],
    );

    return (
      <ScrollArea.Root {...composableProps(props)} orientation='vertical' ref={forwardedRef}>
        <ScrollArea.Viewport>
          {items.length > 0 ? (
            <PluginList
              plugins={items}
              installed={installedIds}
              installing={installingIds}
              updating={updatingIds}
              updateAvailableIds={updateAvailableIds}
              enabled={enabled}
              extraTagsById={extraTagsById}
              onClick={handleClick}
              onChange={handleChange}
              onInstall={handleInstall}
              onUpdate={handleUpdate}
              hasSettings={hasSettings}
              onSettings={handleSettings}
            />
          ) : error ? (
            <div className='p-4 text-description'>Failed to load registry plugins: {error.message}</div>
          ) : loading ? (
            <div className='p-4 text-description'>{t('loading.label')}</div>
          ) : (
            <div className='p-4 text-description'>No registry plugins available.</div>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

Registry.displayName = 'Registry';
