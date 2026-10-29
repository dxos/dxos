//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { TypeSafeNamespace } from '../namespace.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./TypeSafeSettings.ts').Settings>>()(
  `${TypeSafeNamespace.key}.capability.settings`,
);
