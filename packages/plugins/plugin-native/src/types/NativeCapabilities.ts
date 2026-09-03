//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

// Inline imports to avoid `Settings` / `Update` namespace aliases colliding with the
// capability constants exported below.
export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
export const UpdateManager = Capability.makeSingleton<import('./Update.ts').Manager>()(
  `${meta.profile.key}.capability.updateManager`,
);
