//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { SettingsInterfaceCapabilities } from './capabilities';
import { SETTINGS_INTERFACE_PLUGIN } from '../meta';

export default () => {
  const state = new LocalStorageStore<SettingsInterfaceCapabilities.State>(SETTINGS_INTERFACE_PLUGIN, {
    selected: 'dxos.org/plugin/registry',
  });

  state.prop({ key: 'selected', type: LocalStorageStore.string() });

  return contributes(SettingsInterfaceCapabilities.State, state.values);
};
