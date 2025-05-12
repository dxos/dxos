//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { FILES_PLUGIN } from '../meta';
import { type FilesState } from '../types';

export namespace FileCapabilities {
  export const State = defineCapability<Readonly<FilesState>>(`${FILES_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<FilesState>(`${FILES_PLUGIN}/capability/state`);
}
