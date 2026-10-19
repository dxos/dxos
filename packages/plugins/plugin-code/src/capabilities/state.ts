//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as KvsStore from '@dxos/effect/KvsStore';

import { meta } from '#meta';
import { CodeCapabilities, State } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // Its own key: the settings atom stores under the plugin's key.
    const stateAtom = KvsStore.make({
      key: `${meta.profile.key}.state`,
      schema: State.State,
      defaultValue: () => ({}),
    });

    return Capability.contribute(CodeCapabilities.State, stateAtom);
  }),
);
