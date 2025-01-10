//
// Copyright 2025 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import { Capabilities, Events } from './common';
import { eventKey } from './manager';
import { contributes, defineModule, definePlugin } from './plugin';
import SettingsMeta from '../plugin-settings/meta';

export const SettingsPlugin = definePlugin(SettingsMeta, [
  defineModule({
    id: `${SettingsMeta.id}/store`,
    dependentEvents: [eventKey(Events.SetupSettings)],
    activationEvents: [eventKey(Events.Startup)],
    triggeredEvents: [eventKey(Events.SettingsReady)],
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
