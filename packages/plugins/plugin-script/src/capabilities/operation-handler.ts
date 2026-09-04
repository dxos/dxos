//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ScriptOperationHandlerSet } from '#operations';

import { ScriptHandlers } from '../skills/functions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      Capabilities.OperationHandler,
      OperationHandlerSet.merge(ScriptOperationHandlerSet.handlers, ScriptHandlers),
    );
  }),
);
