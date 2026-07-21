//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import * as SettingsModule from './Settings';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>(
  `${meta.profile.key}.capability.settings`,
);
