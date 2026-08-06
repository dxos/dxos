//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import * as SettingsModule from './Settings';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
