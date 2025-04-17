//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { type Compiler } from '../compiler';
import { meta } from '../meta';

export namespace ScriptCapabilities {
  export const Compiler = defineCapability<Compiler>(`${meta.id}/capability/compiler`);
}
