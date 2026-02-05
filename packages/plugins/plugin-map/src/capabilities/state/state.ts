//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { MapCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = createKvsStore({
      key: meta.id,
      schema: MapCapabilities.StateSchema,
      defaultValue: () => ({
        type: 'map' as const,
      }),
    });

    return Capability.contributes(MapCapabilities.State, stateAtom);
  }),
);
