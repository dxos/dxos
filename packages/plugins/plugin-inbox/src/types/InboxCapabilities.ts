//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

// Inline import to avoid `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Plugins contribute object extractors via this capability.
 * Multiple plugins may register; the ExtractMessage operation selects one based on match() confidence.
 */
export const ObjectExtractor = Capability.make<import('@dxos/extractor').ObjectExtractor>(
  `${meta.profile.key}.capability.objectExtractor`,
);

/**
 * The per-space in-memory FactStore registry shared between fact-writing operations and
 * fact-reading surfaces. See `../capabilities/fact-store`.
 */
export const FactStoreRegistry = Capability.make<import('../capabilities/fact-store').FactStoreRegistry>(
  `${meta.profile.key}.capability.factStoreRegistry`,
);
