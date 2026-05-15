//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { DisableDependentsAlert, PluginList, type PluginListProps, type PluginRef } from '#components';
import { getPluginPath, meta } from '#meta';

const matchesFilter = (plugin: Plugin.Plugin, query: string) => {
  const haystack = `${plugin.meta.name ?? ''} ${plugin.meta.id}`.toLowerCase();
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
    const { t } = useTranslation(meta.id);
    const manager = usePluginManager();
    const { invoke, invokePromise } = useOperationInvoker();
    const allSettings = useCapabilities(AppCapabilities.Settings);
    const enabled = useAtomValue(manager.enabled);
    const [filter, setFilter] = useState('');

    const filtered = useMemo(() => {
      const query = filter.trim().toLowerCase();
      return query.length === 0 ? plugins : plugins.filter((plugin) => matchesFilter(plugin, query));
    }, [plugins, filter]);

    // Confirmation state for cascading disable. Open when the user toggles
    // off a plugin that has currently-enabled dependents; carries the target
    // id, its display name (for the prompt copy), and the list of dependents
    // shown in the dialog body. Mirrors the equivalent flow in
    // `PluginArticle` so the policy is consistent regardless of where the
    // user toggles from.
    const [cascadePrompt, setCascadePrompt] = useState<{
      open: boolean;
      pluginId: string;
      pluginName: string;
      dependents: readonly PluginRef[];
    }>(() => ({ open: false, pluginId: '', pluginName: '', dependents: [] }));

    const closeCascadePrompt = useCallback(
      () => setCascadePrompt({ open: false, pluginId: '', pluginName: '', dependents: [] }),
      [],
    );

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
        }).pipe(runAndForwardErrors),
      [invoke, manager, source],
    );

    // Resolve a plugin id to a {id, name} pair. Each plugin registers its
    // translations under its own id as the i18n namespace and exposes
    // `plugin.name` as the human-readable label; we look that up first and
    // fall back to the registered plugin's `meta.name`, then the id.
    const resolvePluginRef = useCallback(
      (id: string): PluginRef => {
        const translated = t('plugin.name', { ns: id, defaultValue: '' });
        if (translated) {
          return { id, name: translated };
        }
        const candidate = plugins.find((plugin) => plugin.meta.id === id);
        return { id, name: candidate?.meta.name ?? id };
      },
      [t, plugins],
    );

    const handleChange = useCallback(
      (pluginId: string, nextEnabled: boolean) => {
        if (nextEnabled) {
          return dispatchToggle(pluginId, true);
        }
        const enabledDependents = manager.getDependents(pluginId, { transitive: true, enabledOnly: true });
        if (enabledDependents.length === 0) {
          return dispatchToggle(pluginId, false);
        }
        setCascadePrompt({
          open: true,
          pluginId,
          pluginName: resolvePluginRef(pluginId).name,
          dependents: enabledDependents.map(resolvePluginRef),
        });
      },
      [dispatchToggle, manager, resolvePluginRef],
    );

    const confirmCascadeDisable = useCallback(() => {
      const pluginId = cascadePrompt.pluginId;
      closeCascadePrompt();
      if (pluginId) {
        void dispatchToggle(pluginId, false);
      }
    }, [cascadePrompt.pluginId, closeCascadePrompt, dispatchToggle]);

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
      <>
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
        <DisableDependentsAlert
          open={cascadePrompt.open}
          pluginName={cascadePrompt.pluginName}
          dependents={cascadePrompt.dependents}
          onCancel={closeCascadePrompt}
          onConfirm={confirmCascadeDisable}
        />
      </>
    );
  },
);

BaseRegistryArticle.displayName = 'BaseRegistryArticle';
