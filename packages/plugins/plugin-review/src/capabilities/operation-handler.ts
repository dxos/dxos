//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CommentOperationHandlerSet } from '#operations';

export const OperationHandler = AppCapability.operationHandler(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.OperationHandler, CommentOperationHandlerSet.handlers);
  }),
  {
    activatesOn: ActivationEvents.Idle,
  },
);
