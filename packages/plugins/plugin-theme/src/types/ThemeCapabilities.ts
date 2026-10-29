//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { ThemeNamespace } from '../namespace.ts';
import * as SettingsModule from './Settings.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${ThemeNamespace.key}.capability.settings`,
);
