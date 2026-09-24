//
// Copyright 2025 DXOS.org
//

// Operation handler capability module.
// `Capability.makeModule` creates a module that runs during plugin activation.
// `Capability.contributes` registers the operation handler set with the framework's
// operation dispatcher, which routes `Operation.invoke()` calls to the correct handler.

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { SampleOperationHandlerSet } from '#operations';

// When the module doesn't need to access other capabilities or perform setup,
// use `Effect.succeed` directly instead of `Effect.fnUntraced(function* () { ... })`.
export const OperationHandler = AppCapability.operationHandler(
  () => Effect.succeed(Capability.contribute(Capabilities.OperationHandler, SampleOperationHandlerSet)),
  {
    activatesOn: ActivationEvents.Idle,
  },
);
