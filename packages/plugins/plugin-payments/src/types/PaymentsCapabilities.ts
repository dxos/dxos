//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.profile.key}.capability.settings`,
);
