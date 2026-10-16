//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import type * as AgentSettings from './AgentSettings.ts';

/** The plugin's settings, which the settings panel edits. */
export const Settings = Capability.makeSingleton<Atom.Writable<AgentSettings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);
