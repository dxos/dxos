//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

/**
 * The per-space in-memory FactStore registry shared between fact-writing operations and
 * fact-reading surfaces. See `./FactStoreRegistry`.
 */
export const FactStoreRegistry = Capability.make<import('./FactStoreRegistry').FactStoreRegistry>(
  `${meta.profile.key}.capability.factStoreRegistry`,
);
