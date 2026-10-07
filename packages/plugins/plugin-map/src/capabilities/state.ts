//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as KvsStore from '@dxos/effect/KvsStore';

import { meta } from '#meta';
import { MapCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = KvsStore.make({
      key: `${meta.profile.key}.state`,
      schema: MapCapabilities.StateSchema,
      defaultValue: () => ({
        type: 'map' as const,
      }),
    });

    return Capability.contribute(MapCapabilities.State, stateAtom);
  }),
);
