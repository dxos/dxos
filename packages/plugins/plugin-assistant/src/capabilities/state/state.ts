//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { AssistantCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // NOTE: This needs to be a chat object rather than a string id to avoid a query race.
    // TODO(wittjosiah): Handle serialization and hydration for this so it can be cached.
    const stateAtom = createKvsStore({
      key: meta.id,
      schema: AssistantCapabilities.StateSchema,
      defaultValue: () => ({
        currentChat: {},
      }),
    });

    return Capability.contributes(AssistantCapabilities.State, stateAtom);
  }),
);
