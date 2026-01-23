//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { type Compiler } from '../compiler';
import { meta } from '../meta';

export namespace ScriptCapabilities {
  export const Compiler = Capability.make<Compiler>(`${meta.id}/capability/compiler`);
}
