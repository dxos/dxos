//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { PlanetCache } from '../engine';
import * as TerraCapabilities from '../types/TerraCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const cache = new PlanetCache();
    return Capability.contribute(TerraCapabilities.PlanetCache, cache, () => Effect.sync(() => cache.clear()));
  }),
);
