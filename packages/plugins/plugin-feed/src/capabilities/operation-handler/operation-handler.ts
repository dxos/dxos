//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

// Stub: no handlers registered yet (added in Task 5).
export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, OperationHandlerSet.empty);
  }),
);
