//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import * as Settings from './Settings';
import { type FilesState } from './schema';

export namespace FileCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);

  export const State = Capability.make<Atom.Writable<FilesState>>(`${meta.id}.capability.state`);
}
