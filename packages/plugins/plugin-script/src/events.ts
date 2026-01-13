//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace ScriptEvents {
  export const SetupCompiler = ActivationEvent.make(`${meta.id}/event/setup-compiler`);
}
