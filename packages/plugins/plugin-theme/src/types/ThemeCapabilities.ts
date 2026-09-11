//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import * as SettingsModule from './Settings.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
