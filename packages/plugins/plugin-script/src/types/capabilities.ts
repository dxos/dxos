//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { type Compiler } from '../compiler';
import { meta } from '../meta';

import { type Settings as SettingsType } from './Settings';

export namespace ScriptCapabilities {
  export const Settings = Capability.make<Atom.Writable<SettingsType>>(`${meta.id}.capability.settings`);
  export const Compiler = Capability.make<Compiler>(`${meta.id}.capability.compiler`);
}
