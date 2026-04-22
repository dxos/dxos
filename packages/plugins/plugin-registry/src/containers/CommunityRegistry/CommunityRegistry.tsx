//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo } from 'react';

import { Plugin, UrlLoader } from '@dxos/app-framework';
import { useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { type PluginEntry } from '@dxos/protocols';
import { ScrollArea, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { PluginList } from '#components';
import { getPluginPath, meta } from '#meta';

import { useAutoTags, useCommunityPlugins } from '../../hooks';

const sortEntries = (a: PluginEntry, b: PluginEntry) =>
  (a.meta.name ?? a.meta.id).localeCompare(b.meta.name ?? b.meta.id);

/**
 * Turns a community manifest entry into a minimal Plugin object so we can reuse
 * {@link PluginList} for rendering. The synthesized plugin has no modules — it
 * exists only for display until the user installs it.
 */
const toDisplayPlugin = (entry: PluginEntry): Plugin.Plugin =>
  ({
    [Plugin.PluginTypeId]: Plugin.PluginTypeId,
    meta: entry.meta,
    modules: [],
  }) as Plugin.Plugin;

export type CommunityRegistryProps = {
  id: string;
};

export const CommunityRegistry = composable<HTMLDivElement, CommunityRegistryProps>(
  ({ id, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const manager = usePluginManager();
    const { invoke, invokePromise } = useOperationInvoker();
    const { entries, loading, error } = useCommunityPlugins();
    const enabled = useAtomValue(manager.enabled);
    const plugins = useAtomValue(manager.plugins);
    const installedIds = useMemo(() => new Set(plugins.map((plugin) => plugin.meta.id)), [plugins]);
    const allSettings = useCapabilities(AppCapabilities.Settings);
    const extraTagsById = useAutoTags(entries);

    const sortedEntries = useMemo(() => [...entries].sort(sortEntries), [entries]);
    const moduleUrlById = useMemo(() => {
      const map: Record<string, string> = {};
      for (const entry of sortedEntries) {
        map[entry.meta.id] = entry.moduleUrl;
      }
      return map;
    }, [sortedEntries]);

    // Plugins the user loaded by URL that aren't in the Edge catalog belong in
    // the community section — otherwise they'd be invisible (they're filtered
    // out of Official/Recommended by `useRemotePluginIds`).
    const displayPlugins = useMemo(() => {
      const catalogIds = new Set(sortedEntries.map((entry) => entry.meta.id));
      const remoteIds = new Set(UrlLoader.getRemoteEntries().map((entry) => entry.id));
      const fromCatalog = sortedEntries.map(toDisplayPlugin);
      const fromUrl = plugins.filter((plugin) => remoteIds.has(plugin.meta.id) && !catalogIds.has(plugin.meta.id));
      return [...fromCatalog, ...fromUrl].sort((a, b) => (a.meta.name ?? a.meta.id).localeCompare(b.meta.name ?? b.meta.id));
    }, [sortedEntries, plugins]);

    const handleChange = useCallback(
      (pluginId: string, nextEnabled: boolean) =>
        Effect.gen(function* () {
          if (nextEnabled) {
            if (installedIds.has(pluginId)) {
              yield* manager.enable(pluginId);
            } else {
              const moduleUrl = moduleUrlById[pluginId];
              if (!moduleUrl) {
                return;
              }
              yield* manager.add(moduleUrl);
            }
          } else {
            yield* manager.disable(pluginId);
          }

          yield* invoke(ObservabilityOperation.SendEvent, {
            name: 'plugins.toggle',
            properties: { plugin: pluginId, enabled: nextEnabled, source: 'community' },
          });
        }).pipe(runAndForwardErrors),
      [invoke, manager, installedIds, moduleUrlById],
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
          {displayPlugins.length > 0 ? (
            <PluginList
              plugins={displayPlugins}
              enabled={enabled}
              extraTagsById={extraTagsById}
              onClick={handleClick}
              onChange={handleChange}
              hasSettings={hasSettings}
              onSettings={handleSettings}
            />
          ) : error ? (
            <div className='p-4 text-description'>Failed to load community plugins: {error.message}</div>
          ) : loading ? (
            <div className='p-4 text-description'>{t('loading.label')}</div>
          ) : (
            <div className='p-4 text-description'>No community plugins available.</div>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

CommunityRegistry.displayName = 'CommunityRegistry';
