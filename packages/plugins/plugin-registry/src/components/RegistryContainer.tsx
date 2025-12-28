//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Capabilities, LayoutAction, type Plugin, SettingsAction, createIntent } from '@dxos/app-framework';
import { useCapability, useIntentDispatcher, usePluginManager } from '@dxos/app-framework/react';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { StackItem } from '@dxos/react-ui-stack';

import { PluginList } from './PluginList';

const sortByPluginMeta = ({ meta: { name: a = '' } }: Plugin.Plugin, { meta: { name: b = '' } }: Plugin.Plugin) =>
  a.localeCompare(b);

export const RegistryContainer = ({ id, plugins: _plugins }: { id: string; plugins: Plugin.Plugin[] }) => {
  const manager = usePluginManager();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const plugins = useMemo(() => _plugins.sort(sortByPluginMeta), [_plugins]);
  const settingsStore = useCapability(Capabilities.SettingsStore);

  // TODO(wittjosiah): Factor out to an intent?
  const handleChange = useCallback(
    async (id: string, enabled: boolean) => {
      if (enabled) {
        await manager.enable(id);
      } else {
        await manager.disable(id);
      }

      await dispatch(
        createIntent(ObservabilityAction.SendEvent, {
          name: 'plugins.toggle',
          properties: {
            plugin: id,
            enabled,
          },
        }),
      );
    },
    [dispatch, manager],
  );

  const handleClick = useCallback(
    (pluginId: string) =>
      dispatch(
        createIntent(LayoutAction.Open, {
          part: 'main',
          // TODO(wittjosiah): `/` currently is not supported in ids.
          subject: [pluginId.replaceAll('/', ':')],
          options: { pivotId: id, positioning: 'end' },
        }),
      ),
    [dispatch, id],
  );

  const hasSettings = useCallback((pluginId: string) => !!settingsStore.getStore(pluginId), [settingsStore]);

  const handleSettings = useCallback(
    (pluginId: string) => dispatch(createIntent(SettingsAction.Open, { plugin: pluginId })),
    [dispatch],
  );

  return (
    <StackItem.Content scrollable>
      <PluginList
        plugins={plugins}
        enabled={manager.enabled}
        onClick={handleClick}
        onChange={handleChange}
        hasSettings={hasSettings}
        onSettings={handleSettings}
      />
    </StackItem.Content>
  );
};
