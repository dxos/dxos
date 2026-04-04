//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import * as Settings from './Settings';

export namespace SketchCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.SettingsType>>(`${meta.id}.capability.settings`);
}
