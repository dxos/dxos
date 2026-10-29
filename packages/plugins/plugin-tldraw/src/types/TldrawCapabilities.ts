//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import { TldrawNamespace } from '../namespace.ts';

// Inline import to avoid `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = TldrawNamespace.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()('settings');
