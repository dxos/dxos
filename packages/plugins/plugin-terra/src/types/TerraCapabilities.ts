//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { type PlanetCache as PlanetCacheType } from '../engine';
import { meta } from '../meta';

/**
 * Planets generated so far, shared by every Terra surface and outliving each one: generation takes
 * seconds at the default resolution, and an article remounts whenever it is resized or reopened
 * alongside a companion.
 */
export const PlanetCache = Capability.makeSingleton<PlanetCacheType>()(`${meta.profile.key}.capability.planetCache`);
