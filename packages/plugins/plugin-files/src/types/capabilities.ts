//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { type FilesState } from './schema';

export namespace FileCapabilities {
  export const State = Capability.make<Readonly<FilesState>>(`${meta.id}/capability/state`);
  export const MutableState = Capability.make<FilesState>(`${meta.id}/capability/state`);
}
