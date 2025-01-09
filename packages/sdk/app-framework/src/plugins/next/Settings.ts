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
    activationEvents: [eventKey(Events.Startup)],
    triggeredEvents: [eventKey(Events.SettingsReady)],
    activate: () => contributes(Capabilities.SettingsStore, new RootSettingsStore()),
  }),
]);
