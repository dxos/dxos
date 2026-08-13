//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

export type SpotlightState = {
  dialogContent?: { component: string; props?: Record<string, any> };
  dialogOpen: boolean;
  dismissTimeout?: ReturnType<typeof setTimeout>;
};

export const State = Capability.makeSingleton<Atom.Writable<SpotlightState>>()(`${meta.profile.key}.state`);
