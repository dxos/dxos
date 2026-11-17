//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { BrainNamespace } from '../namespace.ts';

/** Writable atom holding the fact-analysis {@link BrainSettings.Settings} (model/provider/strict). */
export const Settings = Capability.makeSingleton<Atom.Writable<import('./BrainSettings.ts').Settings>>()(
  `${BrainNamespace.key}.capability.settings`,
);
