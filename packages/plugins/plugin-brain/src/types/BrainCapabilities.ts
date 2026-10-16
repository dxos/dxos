//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

/** Writable atom holding the fact-analysis {@link BrainSettings.Settings} (model/provider/strict). */
export const Settings = Capability.makeSingleton<Atom.Writable<import('./BrainSettings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
