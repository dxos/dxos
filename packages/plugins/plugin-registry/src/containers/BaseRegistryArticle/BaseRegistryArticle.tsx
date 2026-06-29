//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';

import { PluginList, type PluginListProps } from '#components';
import { getPluginPath, meta } from '#meta';

import { useDisableConfirmation } from '../../hooks';

const matchesFilter = (plugin: Plugin.Plugin, query: string) => {
  const haystack = `${plugin.meta.profile.name ?? ''} ${plugin.meta.profile.key}`.toLowerCase();
  return haystack.includes(query);
};

export type BaseRegistryArticleProps = {
  /** Article id used as the pivotId when opening a plugin's detail surface. */
  id: string;
  /** Plugins to display, pre-sorted by the caller. */
  plugins: readonly Plugin.Plugin[];
  /**
   * Distinguishes the source of toggle events for observability
   * (e.g. `'registry'` for the public registry surface).
   */
  source?: string;
  /** Rendered in place of the list when no plugins match the current filter. */
  empty?: ReactNode;
} & Pick<
  PluginListProps,
  | 'installed'
  | 'installing'
  | 'updating'
  | 'updateAvailableIds'
  | 'extraTagsById'
  | 'failuresById'
  | 'onInstall'
  | 'onUpdate'
>;

export const BaseRegistryArticle = composable<HTMLDivElement, BaseRegistryArticleProps>(
  (
    {
      id,
      plugins,
      source,
      empty,
      installed,
      installing,
      updating,
      updateAvailableIds,
      extraTagsById,
      failuresById,
      onInstall,
      onUpdate,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.profile.key);
    const manager = usePluginManager();
    const { invoke, invokePromise } = useOperationInvoker();
    const allSettings = useCapabilities(AppCapabilities.Settings);
    const enabled = useAtomValue(manager.enabled);
    const [filter, setFilter] = useState('');

    const filtered = useMemo(() => {
      const query = filter.trim().toLowerCase();
      return query.length === 0 ? plugins : plugins.filter((plugin) => matchesFilter(plugin, query));
    }, [plugins, filter]);

    const dispatchToggle = useCallback(
      (pluginId: string, nextEnabled: boolean) =>
        Effect.gen(function* () {
          if (nextEnabled) {
            yield* manager.enable(pluginId);
          } else {
            yield* manager.disable(pluginId);
          }
          yield* invoke(ObservabilityOperation.SendEvent, {
            name: 'plugins.toggle',
            properties: source
              ? { plugin: pluginId, enabled: nextEnabled, source }
              : { plugin: pluginId, enabled: nextEnabled },
          });
        }).pipe(EffectEx.runAndForwardErrors),
      [invoke, manager, source],
    );

    const requestDisable = useDisableConfirmation(manager, (id) => void dispatchToggle(id, false));

    const handleChange = useCallback(
      (pluginId: string, nextEnabled: boolean) => {
        if (nextEnabled) {
          void dispatchToggle(pluginId, true);
          return;
        }
        requestDisable(pluginId);
      },
      [dispatchToggle, requestDisable],
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
      <Panel.Root {...composableProps(props)} ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Input.Root>
              <Input.Label srOnly>{t('filter.label')}</Input.Label>
              <Input.TextInput
                placeholder={t('filter.placeholder')}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </Input.Root>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              {filtered.length > 0 ? (
                <PluginList
                  plugins={filtered}
                  enabled={enabled}
                  installed={installed}
                  installing={installing}
                  updating={updating}
                  updateAvailableIds={updateAvailableIds}
                  extraTagsById={extraTagsById}
                  failuresById={failuresById}
                  onClick={handleClick}
                  onChange={handleChange}
                  onInstall={onInstall}
                  onUpdate={onUpdate}
                  hasSettings={hasSettings}
                  onSettings={handleSettings}
                />
              ) : (
                empty
              )}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    );
  },
);

BaseRegistryArticle.displayName = 'BaseRegistryArticle';
