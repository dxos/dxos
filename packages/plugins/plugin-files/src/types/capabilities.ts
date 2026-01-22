//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type LocalStorageStore } from '@dxos/local-storage';

import { meta } from '../meta';

import { type FilesSettingsProps, type FilesState } from './schema';

export namespace FileCapabilities {
  export const Settings = Capability.make<Atom.Writable<FilesSettingsProps>>(`${meta.id}/capability/settings`);

  export const State = Capability.make<LocalStorageStore<FilesState>>(`${meta.id}/capability/state`);
}
