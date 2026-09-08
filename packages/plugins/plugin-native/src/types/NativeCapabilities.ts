//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

// Inline imports to avoid `Settings` / `Update` namespace aliases colliding with the
// capability constants exported below.
export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
// Re-exported rather than declared: the web contributes the same capability from `plugin-pwa`, so a
// settings surface resolves one identifier and gets whichever platform is present. A second identifier
// here would mean two rows that can never both be right.
export { UpdateManager } from '@dxos/app-toolkit/AppCapabilities';
