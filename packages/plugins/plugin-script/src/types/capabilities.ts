//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import { type Compiler } from '../compiler';
import * as Settings from './Settings';

export namespace ScriptCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);
  export const Compiler = Capability.make<Compiler>(`${meta.id}.capability.compiler`);
}
