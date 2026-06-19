//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

export type SpotlightState = {
  dialogContent?: { component: string; props?: Record<string, any> };
  dialogOpen: boolean;
  dismissTimeout?: ReturnType<typeof setTimeout>;
};

export const State = Capability.make<Atom.Writable<SpotlightState>>(`${meta.profile.key}.state`);
