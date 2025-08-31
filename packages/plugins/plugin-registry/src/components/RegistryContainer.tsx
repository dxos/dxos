//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import {
  Capabilities,
  LayoutAction,
  type Plugin,
  SettingsAction,
  createIntent,
  useCapability,
  useIntentDispatcher,
  usePluginManager,
} from '@dxos/app-framework';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { StackItem } from '@dxos/react-ui-stack';

import { PluginList } from './PluginList';

const sortByPluginMeta = ({ meta: { name: a = '' } }: Plugin, { meta: { name: b = '' } }: Plugin) => a.localeCompare(b);

export const RegistryContainer = ({ id, plugins: pluginsParam }: { id: string; plugins: Plugin[] }) => {
  const manager = usePluginManager();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const plugins = useMemo(() => pluginsParam.sort(sortByPluginMeta), [pluginsParam]);
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
    <StackItem.Content classNames='min-bs-0 overflow-y-auto scrollbar-thin contain-layout'>
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
