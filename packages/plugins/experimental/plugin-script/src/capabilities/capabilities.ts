//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { type Compiler } from '../compiler';
import { SCRIPT_PLUGIN } from '../meta';

export namespace ScriptCapabilities {
  export const Compiler = defineCapability<Compiler>(`${SCRIPT_PLUGIN}/capability/compiler`);
}
