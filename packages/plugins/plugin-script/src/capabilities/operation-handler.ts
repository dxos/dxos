//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

import { ScriptOperationHandlerSet } from '#operations';

import { ScriptHandlers } from '../skills/functions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      Capabilities.OperationHandler,
      OperationHandlerSet.merge(ScriptOperationHandlerSet, ScriptHandlers),
    );
  }),
);
