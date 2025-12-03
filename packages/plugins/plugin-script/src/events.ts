em//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace ScriptEvents {
  export const SetupCompiler = defineEvent(`${meta.id}/event/setup-compiler`);
}
