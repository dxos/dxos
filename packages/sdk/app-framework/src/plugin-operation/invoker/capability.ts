//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Common from '../../common';
import { Capability } from '../../core';

import * as OperationInvoker from './operation-invoker';

//
// Capability Module
//

export default Capability.makeModule((context) =>
  Effect.gen(function* () {
    // Get the ManagedRuntime capability (should be available since we activate after ManagedRuntimeReady).
    const managedRuntimes = context.getCapabilities(Common.Capability.ManagedRuntime);
    const managedRuntime = managedRuntimes.length > 0 ? managedRuntimes[0] : undefined;

    const invoker = OperationInvoker.make(
      () =>
        Effect.gen(function* () {
          yield* context.activate(Common.ActivationEvent.SetupOperationResolver);
          return context.getCapabilities(Common.Capability.OperationResolver).flat();
        }),
      managedRuntime,
    );

    return Capability.contributes(Common.Capability.OperationInvoker, invoker);
  }),
);
