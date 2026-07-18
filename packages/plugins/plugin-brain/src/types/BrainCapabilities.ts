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
export const FactStoreRegistry = Capability.makeSingleton<import('../capabilities/fact-store').FactStoreRegistry>(
  `${meta.profile.key}.capability.factStoreRegistry`,
);

/** Writable atom holding the fact-analysis {@link BrainSettings.Settings} (model/provider/strict). */
export const Settings = Capability.makeSingleton<
  import('@effect-atom/atom-react').Atom.Writable<import('./BrainSettings').Settings>
>(`${meta.profile.key}.capability.settings`);
