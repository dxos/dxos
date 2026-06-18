//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { Plugin, UrlLoader } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { meta } from '#meta';

import { useAutoTags, useRegistryPlugins, useUpdateAvailableIds } from '../../hooks';
import { BaseRegistryArticle } from '../BaseRegistryArticle';

const sortEntries = (a: Plugin.Meta, b: Plugin.Meta) =>
  (a.profile.name ?? a.profile.key).localeCompare(b.profile.name ?? b.profile.key);

const sortPlugins = (a: Plugin.Plugin, b: Plugin.Plugin) =>
  (a.meta.profile.name ?? a.meta.profile.key).localeCompare(b.meta.profile.name ?? b.meta.profile.key);

/**
 * Turns a registry catalog entry into a minimal Plugin object so we can reuse
 * {@link BaseRegistryArticle} for rendering. The synthesized plugin has no
 * modules — it exists only for display until the user installs it.
 */
const toDisplayPlugin = (plugin: Plugin.Meta): Plugin.Plugin =>
  ({
    [Plugin.PluginTypeId]: Plugin.PluginTypeId,
    meta: Plugin.makeMeta({
      key: DXN.make(plugin.profile.key),
      name: plugin.profile.name,
      description: plugin.profile.description,
      homePage: plugin.profile.homePage,
      source: plugin.profile.source,
      screenshots: plugin.profile.screenshots,
      tags: plugin.profile.tags,
      icon: plugin.profile.icon,
      author: plugin.profile.author,
    }),
    modules: [],
  }) as Plugin.Plugin;

export type PublicRegistryArticleProps = {
  id: string;
};

export const PublicRegistryArticle = composable<HTMLDivElement, PublicRegistryArticleProps>(
  ({ id, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const manager = usePluginManager();
    const { invoke } = useOperationInvoker();
    const { entries, loading, error } = useRegistryPlugins();
    const plugins = useAtomValue(manager.plugins);
    const installedIds = useMemo(() => plugins.map((plugin) => plugin.meta.profile.key), [plugins]);
    const extraTagsById = useAutoTags(entries);

    // Snapshot of installed plugin ids at mount time. Used to sort installed
    // plugins to the top without having newly-installed rows jump up mid-session.
    const [installedSnapshot] = useState<ReadonlySet<string>>(
      () => new Set(manager.getPlugins().map((plugin) => plugin.meta.profile.key)),
    );

    const [installingIds, setInstallingIds] = useState<readonly string[]>([]);
    const [updatingIds, setUpdatingIds] = useState<readonly string[]>([]);
    const updateAvailableIds = useUpdateAvailableIds(entries);

    const sortedEntries = useMemo(() => [...entries].sort(sortEntries), [entries]);
    const moduleUrlById = useMemo(() => {
      const map: Record<string, string> = {};
      for (const entry of sortedEntries) {
        if (entry.release?.moduleUrl) {
          map[entry.profile.key] = entry.release.moduleUrl;
        }
      }
      return map;
    }, [sortedEntries]);

    // Maps plugin id → current registry version (i.e. plugin.version from the catalog).
    const versionById = useMemo(() => {
      const map: Record<string, string> = {};
      for (const entry of sortedEntries) {
        if (entry.release?.version) {
          map[entry.profile.key] = entry.release.version;
        }
      }
      return map;
    }, [sortedEntries]);

    // Single list with installed-at-mount plugins sorted to the top. Sort order
    // is based on the mount-time snapshot so rows don't jump as the user
    // installs plugins during the session.
    const items = useMemo(() => {
      const catalogIds = new Set(sortedEntries.map((entry) => entry.profile.key));
      const remoteIds = new Set(UrlLoader.getRemoteEntries().map((entry) => entry.id));
      const fromCatalog = sortedEntries.map(toDisplayPlugin);
      const fromUrlOnly = plugins.filter(
        (plugin) => remoteIds.has(plugin.meta.profile.key) && !catalogIds.has(plugin.meta.profile.key),
      );
      const installedFirst = [...fromCatalog, ...fromUrlOnly].sort((a, b) => {
        const aInstalled = installedSnapshot.has(a.meta.profile.key);
        const bInstalled = installedSnapshot.has(b.meta.profile.key);
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
          yield* manager.enable(plugin.meta.profile.key);
          // Persist the installed version for future update detection.
          if (version) {
            UrlLoader.setInstalledVersion(plugin.meta.profile.key, version);
          }
          yield* invoke(ObservabilityOperation.SendEvent, {
            name: 'plugins.install',
            properties: { plugin: plugin.meta.profile.key, source: 'registry' },
          });
        }).pipe(
          Effect.ensuring(Effect.sync(() => setInstallingIds((prev) => prev.filter((pid) => pid !== pluginId)))),
          EffectEx.runAndForwardErrors,
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
          yield* manager.enable(plugin.meta.profile.key);
          if (version) {
            UrlLoader.setInstalledVersion(plugin.meta.profile.key, version);
          }
          yield* invoke(ObservabilityOperation.SendEvent, {
            name: 'plugins.update',
            properties: { plugin: plugin.meta.profile.key, source: 'registry' },
          });
        }).pipe(
          Effect.ensuring(Effect.sync(() => setUpdatingIds((prev) => prev.filter((pid) => pid !== pluginId)))),
          EffectEx.runAndForwardErrors,
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
