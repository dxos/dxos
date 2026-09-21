//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ScriptOperationHandlerSet } from '#operations';

import { ScriptHandlers } from '../skills/functions/index.ts';

export const OperationHandler = AppCapability.operationHandler(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      Capabilities.OperationHandler,
      OperationHandlerSet.merge(ScriptOperationHandlerSet.handlers, ScriptHandlers),
    );
  }),
  {
    activatesOn: ActivationEvents.Idle,
  },
);
