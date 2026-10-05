//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import * as EffectEx from '@dxos/effect/EffectEx';

import { RegistrySettings } from '#components';
import { type RegistrySettings as RegistrySettingsType } from '#types';

export type RegistrySettingsContainerProps = {
  subject: AppCapabilities.Settings;
};

/**
 * Wires the {@link RegistrySettings} presentational component to the plugin
 * manager and the settings atom: subscribes to `manager.devPluginIds` for the
 * "currently loaded" indicator and exposes enable/disable callbacks that drive
 * the manager's add/enable/remove flow.
 */
export const RegistrySettingsContainer = ({ subject }: RegistrySettingsContainerProps) => {
  const manager = PluginManagerProvider.usePluginManager();
  const { settings, updateSettings } = Hooks.useSettingsState<RegistrySettingsType>(subject.atom);
  const activeDevPluginIds = useAtomValue(manager.devPluginIds);
  const pluginScope = ToolkitHooks.useSettingsScope(AppSettings.PLUGINS_NAMESPACE);

  const onEnableDev = useCallback(
    async (url: string) => {
      await EffectEx.runAndForwardErrors(
        Effect.gen(function* () {
          const plugin = yield* manager.add(url);
          yield* manager.enable(plugin.meta.profile.key);
        }),
      );
    },
    [manager],
  );

  const onDisableDev = useCallback(
    async (id: string) => {
      await EffectEx.runAndForwardErrors(manager.remove(id));
    },
    [manager],
  );

  return (
    <RegistrySettings
      scope={<SettingsScope.Root prefix={subject.prefix} />}
      settings={settings}
      onSettingsChange={updateSettings}
      activeDevPluginIds={activeDevPluginIds}
      onEnableDev={onEnableDev}
      onDisableDev={onDisableDev}
      pluginScopeLocal={pluginScope.available ? !pluginScope.synced : undefined}
      onPluginScopeLocalChange={(local) => (local ? pluginScope.takeLocal() : pluginScope.rejoinAccount())}
    />
  );
};

RegistrySettingsContainer.displayName = 'RegistrySettingsContainer';
