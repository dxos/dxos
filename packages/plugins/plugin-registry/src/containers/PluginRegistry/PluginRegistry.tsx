//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { type Plugin } from '@dxos/app-framework';
import { useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { ComposableProps, ScrollArea } from '@dxos/react-ui';
import { composableProps } from '@dxos/ui-theme';

import { PluginList } from '../../components';
import { getPluginPath } from '../../meta';

const sortByPluginMeta = ({ meta: { name: a = '' } }: Plugin.Plugin, { meta: { name: b = '' } }: Plugin.Plugin) =>
  a.localeCompare(b);

export type PluginRegistryProps = ComposableProps & {
  id: string;
  plugins: Plugin.Plugin[];
};

export const PluginRegistry = forwardRef<HTMLDivElement, PluginRegistryProps>(({ id, plugins: pluginsProp, ...props }, forwardedRef) => {
  const manager = usePluginManager();
  const { invoke, invokePromise } = useOperationInvoker();
  const plugins = useMemo(() => pluginsProp.sort(sortByPluginMeta), [pluginsProp]);
  const enabled = useAtomValue(manager.enabled);
  const allSettings = useCapabilities(AppCapabilities.Settings);

  // TODO(wittjosiah): Factor out to an intent?
  const handleChange = useCallback(
    (id: string, enabled: boolean) =>
      Effect.gen(function* () {
        if (enabled) {
          yield* manager.enable(id);
        } else {
          yield* manager.disable(id);
        }

        yield* invoke(ObservabilityOperation.SendEvent, {
          name: 'plugins.toggle',
          properties: {
            plugin: id,
            enabled,
          },
        });
      }).pipe(runAndForwardErrors),
    [invoke, manager],
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

  const hasSettings = useCallback((pluginId: string) => allSettings.some((s) => s.prefix === pluginId), [allSettings]);

  const handleSettings = useCallback(
    (pluginId: string) => invokePromise(SettingsOperation.Open, { plugin: pluginId }),
    [invokePromise],
  );

  return (
    <ScrollArea.Root {...composableProps(props)} orientation='vertical' ref={forwardedRef}>
      <ScrollArea.Viewport>
        <PluginList
          plugins={plugins}
          enabled={enabled}
          onClick={handleClick}
          onChange={handleChange}
          hasSettings={hasSettings}
          onSettings={handleSettings}
        />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

PluginRegistry.displayName = 'PluginRegistry';
