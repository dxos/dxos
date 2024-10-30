//
// Copyright 2023 DXOS.org
//

import { type SettingsStoreFactory, type SettingsValue } from '@dxos/local-storage';

import { type Plugin } from '../plugin-host';

export type SettingsProvides<T extends SettingsValue> = {
  settings: T;
};

export type SettingsPluginProvides = {
  settingsStore: SettingsStoreFactory;
};

export const parseSettingsPlugin = (plugin: Plugin) => {
  return typeof (plugin.provides as any).settingsStore === 'object'
    ? (plugin as Plugin<SettingsPluginProvides>)
    : undefined;
};

const SETTINGS_PLUGIN = 'dxos.org/plugin/settings';

const SETTINGS_ACTION = `${SETTINGS_PLUGIN}/action`;

export enum SettingsAction {
  OPEN = `${SETTINGS_ACTION}/open`,
}
