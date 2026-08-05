//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { TerraCapabilities } from '#types';

import { PlanetCache } from '../engine';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const cache = new PlanetCache();
    return Capability.contributes(TerraCapabilities.PlanetCache, cache, () => Effect.sync(() => cache.clear()));
  }),
);
