//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import { type Compiler as CompilerType } from '../compiler';

// Inline import to avoid `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.profile.key}.capability.settings`,
);
export const Compiler = Capability.make<CompilerType>(`${meta.profile.key}.capability.compiler`);
