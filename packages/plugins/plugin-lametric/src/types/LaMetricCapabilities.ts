//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import type * as Settings from './Settings';

export const SettingsAtom = Capability.makeSingleton<Atom.Writable<Settings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/**
 * What the last push did. A rejection is surfaced because only the user can fix a bad token or app
 * id; an absent configuration is not an error and stays `idle`.
 */
export type PushStatus =
  | { readonly state: 'idle' }
  | { readonly state: 'pushed'; readonly kind: 'local' | 'cloud' }
  | { readonly state: 'failed'; readonly status?: number };

export const PushStatus = Capability.makeSingleton<Atom.Writable<PushStatus>>()(
  `${meta.profile.key}.capability.pushStatus`,
);
