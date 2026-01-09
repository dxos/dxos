//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo } from 'react';

import { Common, type Plugin, SettingsAction, createIntent } from '@dxos/app-framework';
import { useCapability, useIntentDispatcher, usePluginManager } from '@dxos/app-framework/react';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { StackItem } from '@dxos/react-ui-stack';

import { PluginList } from './PluginList';

const sortByPluginMeta = ({ meta: { name: a = '' } }: Plugin.Plugin, { meta: { name: b = '' } }: Plugin.Plugin) =>
  a.localeCompare(b);

export const RegistryContainer = ({ id, plugins: _plugins }: { id: string; plugins: Plugin.Plugin[] }) => {
  const manager = usePluginManager();
  const { dispatch, dispatchPromise } = useIntentDispatcher();
  const plugins = useMemo(() => _plugins.sort(sortByPluginMeta), [_plugins]);
  const enabled = useAtomValue(manager.enabled);
  const settingsStore = useCapability(Common.Capability.SettingsStore);

  // TODO(wittjosiah): Factor out to an intent?
  const handleChange = useCallback(
    (id: string, enabled: boolean) =>
      Effect.gen(function* () {
        if (enabled) {
          yield* manager.enable(id);
        } else {
          yield* manager.disable(id);
        }

        yield* dispatch(
          createIntent(ObservabilityAction.SendEvent, {
            name: 'plugins.toggle',
            properties: {
              plugin: id,
              enabled,
            },
          }),
        );
      }).pipe(runAndForwardErrors),
    [dispatch, manager],
  );

  const handleClick = useCallback(
    (pluginId: string) =>
      dispatchPromise(
        createIntent(Common.LayoutAction.Open, {
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
    (pluginId: string) => dispatchPromise(createIntent(SettingsAction.Open, { plugin: pluginId })),
    [dispatch],
  );

  return (
    <StackItem.Content scrollable>
      <PluginList
        plugins={plugins}
        enabled={enabled}
        onClick={handleClick}
        onChange={handleChange}
        hasSettings={hasSettings}
        onSettings={handleSettings}
      />
    </StackItem.Content>
  );
};
