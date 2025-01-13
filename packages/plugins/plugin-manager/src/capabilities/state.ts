//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { ManagerCapabilities } from './capabilities';
import { MANAGER_PLUGIN } from '../meta';
import { type SettingsState } from '../types';

export default () => {
  const state = new LocalStorageStore<SettingsState>(MANAGER_PLUGIN, {
    selected: 'dxos.org/plugin/registry',
  });

  state.prop({ key: 'selected', type: LocalStorageStore.string() });

  return contributes(ManagerCapabilities.State, state.values);
};
