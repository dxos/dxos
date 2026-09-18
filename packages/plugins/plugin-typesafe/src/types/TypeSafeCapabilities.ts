//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./TypeSafeSettings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
