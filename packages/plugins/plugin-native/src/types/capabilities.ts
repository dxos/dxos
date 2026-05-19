//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import * as Settings from './Settings';
import * as Update from './Update';

export namespace NativeCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);
  export const UpdateManager = Capability.make<Update.Manager>(`${meta.id}.capability.update-manager`);
}
