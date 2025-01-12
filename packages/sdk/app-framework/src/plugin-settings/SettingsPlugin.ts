//
// Copyright 2025 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import { SETTINGS_PLUGIN } from './actions';
import { Capabilities, Events } from '../common';
import { contributes, defineModule, definePlugin } from '../core';

export const SettingsPlugin = () =>
  definePlugin({ id: SETTINGS_PLUGIN }, [
    defineModule({
      id: `${SETTINGS_PLUGIN}/module/store`,
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
