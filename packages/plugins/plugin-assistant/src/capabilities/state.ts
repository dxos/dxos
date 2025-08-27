//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { meta } from '../meta';

import { AssistantCapabilities } from './capabilities';

export default () => {
  const state = new LocalStorageStore<AssistantCapabilities.AssistantState>(meta.id, {
    currentChat: {},
  });

  return contributes(AssistantCapabilities.State, state.values, () => state.close());
};
