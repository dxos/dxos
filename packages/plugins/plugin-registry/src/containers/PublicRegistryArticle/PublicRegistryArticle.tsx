//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { type Registry, Plugin, UrlLoader } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { meta } from '#meta';

import { useAutoTags, useRegistryPlugins, useUpdateAvailableIds } from '../../hooks';
import { BaseRegistryArticle } from '../BaseRegistryArticle';

const sortEntries = (a: Registry.Plugin, b: Registry.Plugin) => (a.name ?? a.id).localeCompare(b.name ?? b.id);

const sortPlugins = (a: Plugin.Plugin, b: Plugin.Plugin) =>
  (a.meta.name ?? a.meta.id).localeCompare(b.meta.name ?? b.meta.id);

/**
 * Turns a registry catalog entry into a minimal Plugin object so we can reuse
 * {@link BaseRegistryArticle} for rendering. The synthesized plugin has no
 * modules — it exists only for display until the user installs it.
 */
const toDisplayPlugin = (plugin: Registry.Plugin): Plugin.Plugin =>
  ({
    [Plugin.PluginTypeId]: Plugin.PluginTypeId,
    meta: {
      id: DXN.tryMake(plugin.id) ?? DXN.make(plugin.id),
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

export type PublicRegistryArticleProps = {
  id: string;
};

export const PublicRegistryArticle = composable<HTMLDivElement, PublicRegistryArticleProps>(
  ({ id, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const manager = usePluginManager();
    const { invoke } = useOperationInvoker();
    const { entries, loading, error } = useRegistryPlugins();
    const plugins = useAtomValue(manager.plugins);
    const installedIds = useMemo(() => plugins.map((plugin) => plugin.meta.id), [plugins]);
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

    const empty = error ? (
      <div className='p-4 text-description'>{t('registry.error.label', { message: error.message })}</div>
    ) : loading ? (
      <div className='p-4 text-description'>{t('registry.loading.label')}</div>
    ) : (
      <div className='p-4 text-description'>{t('registry.empty.label')}</div>
    );

    return (
      <BaseRegistryArticle
        {...props}
        id={id}
        source='registry'
        plugins={items}
        installed={installedIds}
        installing={installingIds}
        updating={updatingIds}
        updateAvailableIds={updateAvailableIds}
        extraTagsById={extraTagsById}
        onInstall={handleInstall}
        onUpdate={handleUpdate}
        empty={empty}
        ref={forwardedRef}
      />
    );
  },
);

PublicRegistryArticle.displayName = 'PublicRegistryArticle';
