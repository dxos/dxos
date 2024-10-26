//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '../plugin-host';

// TODO(burdon): Decouple from SettingsPlugin UX.

export type SettingsProvides<T extends Record<string, any> = Record<string, any>> = {
  settings: T; // TODO(burdon): Read-only.
};

export const parseSettingsPlugin = (plugin: Plugin) => {
  return typeof (plugin.provides as any).settings === 'object' ? (plugin as Plugin<SettingsProvides>) : undefined;
};

const SETTINGS_PLUGIN = 'dxos.org/plugin/settings';

const SETTINGS_ACTION = `${SETTINGS_PLUGIN}/action`;

export enum SettingsAction {
  OPEN = `${SETTINGS_ACTION}/open`,
}
