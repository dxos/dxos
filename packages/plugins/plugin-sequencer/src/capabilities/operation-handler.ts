//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { SequencerOperationHandlerSet } from '../operations/index.ts';

// Both node and workerd invoke the Score Read/Write operations behind the sequencer skill's tool
// calls, so the handler has to be reachable headlessly, not just from the browser surface.
export const OperationHandler = AppCapability.operationHandler(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.OperationHandler, SequencerOperationHandlerSet);
  }),
  {
    activatesOn: ActivationEvents.Idle,
  },
);
