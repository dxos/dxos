//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import { type PlanetCache as PlanetCacheType } from '../engine/index.ts';

/**
 * Planets generated so far, shared by every Terra surface and outliving each one: generation takes
 * seconds at the default resolution, and an article remounts whenever it is resized or reopened
 * alongside a companion.
 */
export const PlanetCache = Capability.makeSingleton<PlanetCacheType>()(`${meta.profile.key}.capability.planetCache`);
