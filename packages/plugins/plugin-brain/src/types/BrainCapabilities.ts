//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { BrainNamespace } from '../namespace.ts';

/** Each space's memory as a FactStore, for surfaces and stories that read through one. */
export const FactStoreRegistry = Capability.makeSingleton<
  import('../capabilities/fact-store-registry.ts').FactStoreRegistry
>()(`${BrainNamespace.key}.capability.factStoreRegistry`);

/** Writable atom holding the fact-analysis {@link BrainSettings.Settings} (model/provider/strict). */
export const Settings = Capability.makeSingleton<Atom.Writable<import('./BrainSettings.ts').Settings>>()(
  `${BrainNamespace.key}.capability.settings`,
);
