//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as KvsStore from '@dxos/effect/KvsStore';

import { MapCapabilities } from '#types';

import { MapNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = KvsStore.make({
      key: `${MapNamespace.key}.state`,
      schema: MapCapabilities.StateSchema,
      defaultValue: () => ({
        type: 'map' as const,
      }),
    });

    return Capability.contribute(MapCapabilities.State, stateAtom);
  }),
);
