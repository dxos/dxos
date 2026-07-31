//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { usePluginManager, useSettingsState } from '@dxos/app-framework/ui';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';

import { RegistrySettings } from '../../components';
import { type RegistrySettings as RegistrySettingsType } from '../../types';

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
  const manager = usePluginManager();
  const { settings, updateSettings } = useSettingsState<RegistrySettingsType>(subject.atom);
  const activeDevPluginIds = useAtomValue(manager.devPluginIds);

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
      settings={settings}
      onSettingsChange={updateSettings}
      activeDevPluginIds={activeDevPluginIds}
      onEnableDev={onEnableDev}
      onDisableDev={onDisableDev}
    />
  );
};

RegistrySettingsContainer.displayName = 'RegistrySettingsContainer';
