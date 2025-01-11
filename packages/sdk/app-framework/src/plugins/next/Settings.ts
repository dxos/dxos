//
// Copyright 2025 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import { Capabilities, Events } from './common';
import { contributes, defineModule, definePlugin } from './plugin';
import SettingsMeta from '../plugin-settings/meta';

export const SettingsPlugin = () =>
  definePlugin(SettingsMeta, [
    defineModule({
      id: `${SettingsMeta.id}/module/store`,
      activatesOn: Events.Startup,
      dependsOn: [Events.SetupSettings],
      triggers: [Events.SettingsReady],
      activate: (context) => {
        const allSettings = context.requestCapabilities(Capabilities.Settings);
        const settingsStore = new RootSettingsStore();

        allSettings.forEach((setting) => {
          settingsStore.createStore(setting as any);
        });

        return contributes(Capabilities.SettingsStore, settingsStore);
      },
    }),
  ]);
