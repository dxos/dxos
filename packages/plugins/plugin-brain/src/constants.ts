//
// Copyright 2026 DXOS.org
//

import { meta } from './meta';

/**
 * Sentinel `data` for the facts companion node: the companioned object travels in `companionTo`,
 * so the sentinel subject keeps the companion surface from colliding with primary object surfaces.
 */
export const FACTS_NODE_DATA = `${meta.profile.key}.facts-companion` as const;
