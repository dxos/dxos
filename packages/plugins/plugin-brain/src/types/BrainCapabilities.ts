//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

/**
 * The per-space in-memory FactStore registry shared between fact-writing operations and
 * fact-reading surfaces. See `../capabilities/fact-store`.
 */
export const FactStoreRegistry = Capability.make<import('../capabilities/fact-store').FactStoreRegistry>(
  `${meta.profile.key}.capability.factStoreRegistry`,
);
