//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import type * as LingoSettings from './LingoSettings';

/** Plugin settings atom, shared by the settings surface and the reader companion. */
export const Settings = Capability.makeSingleton<Atom.Writable<LingoSettings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
