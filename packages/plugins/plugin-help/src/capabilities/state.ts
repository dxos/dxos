//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { HELP_PLUGIN } from '../meta';

import { HelpCapabilities } from './capabilities';

export default () => {
  const state = new LocalStorageStore<HelpCapabilities.State>(HELP_PLUGIN, {
    running: false,
    showHints: true,
    showWelcome: true,
  });

  state
    .prop({ key: 'showHints', type: LocalStorageStore.bool() })
    .prop({ key: 'showWelcome', type: LocalStorageStore.bool() });

  return contributes(HelpCapabilities.State, state.values);
};
