//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { MapCapabilities } from '#types';
import { MapEvents } from '#types';

export const MapState = Capability.makeModule(
  'MapState',
  { provides: [MapCapabilities.State], activatesOn: MapEvents.Start },
  () =>
    Effect.sync(() => {
      const stateAtom = createKvsStore({
        key: meta.profile.key,
        schema: MapCapabilities.StateSchema,
        defaultValue: () => ({
          type: 'map' as const,
        }),
      });

      return Capability.contribute(MapCapabilities.State, stateAtom);
    }),
);
