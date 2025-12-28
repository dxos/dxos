//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { meta } from '../meta';

import { AssistantCapabilities } from './capabilities';

export default Capability.makeModule(() => {
  // NOTE: This needs to be a chat object rather than a string id to avoid a query race.
  // TODO(wittjosiah): Handle serialization and hydration for this so it can be cached.
  const state = new LocalStorageStore<AssistantCapabilities.AssistantState>(meta.id, {
    currentChat: {},
  });

  state.prop({ key: 'currentChat', type: LocalStorageStore.json<Record<string, string | undefined>>() });

  return Capability.contributes(AssistantCapabilities.State, state.values, () => state.close());
});
