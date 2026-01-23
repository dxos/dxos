//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationInvoker } from '@dxos/operation';

import * as Common from '../common';
import { Capability, Plugin } from '../core';

//
// Capability Module
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get the services for synchronous access in callbacks.
    const capabilityManager = yield* Capability.Service;
    const pluginManager = yield* Plugin.Service;

    // Get the ManagedRuntime capability (should be available since we activate after ManagedRuntimeReady).
    const managedRuntimes = yield* Capability.getAll(Common.Capability.ManagedRuntime);
    const managedRuntime = managedRuntimes.length > 0 ? managedRuntimes[0] : undefined;

    const invoker = OperationInvoker.make(
      () =>
        Effect.gen(function* () {
          yield* Plugin.activate(Common.ActivationEvent.SetupOperationResolver);
          return (yield* Capability.getAll(Common.Capability.OperationResolver)).flat();
        }).pipe(
          Effect.provideService(Capability.Service, capabilityManager),
          Effect.provideService(Plugin.Service, pluginManager),
        ),
      managedRuntime,
    );

    return Capability.contributes(Common.Capability.OperationInvoker, invoker);
  }),
);
