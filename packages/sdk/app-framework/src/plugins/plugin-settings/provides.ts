//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';
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

export const SETTINGS_PLUGIN = 'dxos.org/plugin/settings';
export const SETTINGS_ACTION = `${SETTINGS_PLUGIN}/action`;

export namespace SettingsAction {
  export class Open extends S.TaggedClass<Open>()(`${SETTINGS_ACTION}/open`, {
    input: S.Struct({
      plugin: S.optional(S.String),
    }),
    output: S.Void,
  }) {}
}
