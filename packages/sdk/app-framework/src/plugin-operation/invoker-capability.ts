//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationHandlerSet, OperationInvoker } from '@dxos/operation';

import { ActivationEvents, Capabilities } from '../common';
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
    const managedRuntime = yield* Capability.get(Capabilities.ManagedRuntime);

    const invoker = OperationInvoker.make(
      () =>
        Effect.gen(function* () {
          yield* Plugin.activate(ActivationEvents.SetupOperationHandler);
          const sets = yield* Capability.getAll(Capabilities.OperationHandler);
          const merged = OperationHandlerSet.merge(...sets);
          return yield* merged.handlers;
        }).pipe(
          Effect.provideService(Capability.Service, capabilityManager),
          Effect.provideService(Plugin.Service, pluginManager),
          Effect.orDie,
        ),
      managedRuntime,
    );

    return Capability.contributes(Capabilities.OperationInvoker, invoker);
  }),
);
