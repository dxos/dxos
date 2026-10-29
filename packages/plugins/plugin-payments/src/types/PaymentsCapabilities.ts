//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { PaymentsNamespace } from '../namespace.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${PaymentsNamespace.key}.capability.settings`,
);
