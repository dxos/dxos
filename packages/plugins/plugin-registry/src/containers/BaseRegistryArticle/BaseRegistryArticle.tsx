//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
// Loaded only through the lazy registry containers, so Next's CSS stays out of the boot graph.
import '@dxos/react-ui/theme.css';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import {
  Container,
  Input,
  Panel,
  ScrollArea,
  Toolbar,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';

import { PluginList, type PluginListProps } from '#components';
import { meta } from '#meta';

import { useDisableConfirmation } from '../../hooks/index.ts';
import { getPluginPath } from '../../paths.ts';

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
  | 'deviceOnlyIds'
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
      deviceOnlyIds,
      onInstall,
      onUpdate,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.profile.key);
    const manager = PluginManagerProvider.usePluginManager();
    const { invoke, invokePromise } = Hooks.useOperationInvoker();
    const allSettings = Hooks.useCapabilities(AppCapabilities.Settings);
    const enabled = useAtomValue(manager.enabled);
    const settingsSync = Hooks.useOptionalCapability(AppCapabilities.SettingsSync);
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
          pivotId: getPluginPath(id),
          disposition: 'add',
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
        <Panel.Header>
          <Toolbar.Root>
            <Input
              aria-label={t('filter.label')}
              placeholder={t('filter.placeholder')}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <ScrollArea.Root>
            <ScrollArea.Viewport asChild>
              <Container gutter='md' padBlock>
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
                    deviceOnlyIds={deviceOnlyIds}
                    onClick={handleClick}
                    readOnly={settingsSync === undefined}
                    onChange={handleChange}
                    onInstall={onInstall}
                    onUpdate={onUpdate}
                    hasSettings={hasSettings}
                    onSettings={handleSettings}
                  />
                ) : (
                  empty
                )}
              </Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Body>
      </Panel.Root>
    );
  },
);

BaseRegistryArticle.displayName = 'BaseRegistryArticle';
