//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { SCRIPT_PLUGIN } from './meta';

export namespace ScriptEvents {
  export const SetupCompiler = defineEvent(`${SCRIPT_PLUGIN}/event/setup-compiler`);
}
