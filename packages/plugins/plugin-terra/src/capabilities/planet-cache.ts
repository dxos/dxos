//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { TerraCapabilities } from '#types';

import { PlanetCache } from '../engine/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const cache = new PlanetCache();
    yield* Effect.addFinalizer(() => Effect.sync(() => cache.clear()));
    return Capability.contribute(TerraCapabilities.PlanetCache, cache);
  }),
);
