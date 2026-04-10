//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

import { ScriptOperationHandlerSet } from '#operations';

import { ScriptHandlers } from '../blueprints/functions';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(
      Capabilities.OperationHandler,
      OperationHandlerSet.merge(ScriptOperationHandlerSet, ScriptHandlers),
    );
  }),
);
