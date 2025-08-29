//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { meta } from '../meta';

import { AssistantCapabilities } from './capabilities';

export default () => {
  // NOTE: This needs to be a chat object rather than a string id to avoid a query race.
  // TODO(wittjosiah): Handle serialization and hydration for this so it can be cached.
  const state = new LocalStorageStore<AssistantCapabilities.AssistantState>(meta.id, {
    currentChat: {},
  });

  return contributes(AssistantCapabilities.State, state.values, () => state.close());
};
