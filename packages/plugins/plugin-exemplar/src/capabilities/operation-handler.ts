//
// Copyright 2025 DXOS.org
//

// Operation handler capability module.
// `Capability.makeModule` creates a module that runs during plugin activation.
// `Capability.contributes` registers the operation handler set with the framework's
// operation dispatcher, which routes `Operation.invoke()` calls to the correct handler.

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/operation';

import { ExemplarOperationHandlerSet } from '#operations';

// When the module doesn't need to access other capabilities or perform setup,
// use `Effect.succeed` directly instead of `Effect.fnUntraced(function* () { ... })`.
export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(() =>
  Effect.succeed(Capability.contributes(Capabilities.OperationHandler, ExemplarOperationHandlerSet)),
);
