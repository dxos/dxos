//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { TerraCapabilities } from '#types';

import { PlanetCache } from '../engine';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const cache = new PlanetCache();
    return Capability.contribute(TerraCapabilities.PlanetCache, cache, () => Effect.sync(() => cache.clear()));
  }),
);
