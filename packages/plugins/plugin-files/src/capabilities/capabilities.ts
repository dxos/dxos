//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { meta } from '../meta';
import { type FilesState } from '../types';

export namespace FileCapabilities {
  export const State = defineCapability<Readonly<FilesState>>(`${meta.id}/capability/state`);
  export const MutableState = defineCapability<FilesState>(`${meta.id}/capability/state`);
}
