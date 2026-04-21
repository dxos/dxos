//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { LayerStack, ProcessManager } from '@dxos/compute-runtime';
import { Process, ServiceResolver, Trace } from '@dxos/functions';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { ActivationEvents, Capabilities } from '../common';
import { Capability, Plugin } from '../core';

//
// Capability Module
//
// Hosts the {@link ProcessManager} runtime for the plugin system.
//
// Workflow:
// 1. Activates {@link ActivationEvents.SetupLayer} so plugins can contribute
//    {@link Capabilities.LayerSpec} entries.
// 2. Collects all contributed {@link LayerSpec.LayerSpec}s and builds a
//    {@link LayerStack} whose {@link ServiceResolver} drives process-scoped
//    service resolution.
// 3. Collects all contributed {@link Capabilities.OperationHandler} sets and
//    merges them into a single {@link OperationHandlerSet} used by the
//    {@link ProcessManager.ProcessOperationInvoker}.
// 4. Composes the fixed runtime requirements (capability/plugin managers,
//    service resolver, operation invoker, process manager) into a single
//    {@link Layer} and builds a {@link ManagedRuntime} from it.
// 5. Exposes a disposable-less wrapper as {@link Capabilities.ProcessManagerRuntime}
//    (the plugin system manages its lifecycle).
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const pluginManager = yield* Plugin.Service;
    const atomRegistry = yield* Capability.get(Capabilities.AtomRegistry);

    yield* Plugin.activate(ActivationEvents.SetupLayer);
    yield* Plugin.activate(ActivationEvents.SetupOperationHandler);

    const layerSpecs = yield* Capability.getAll(Capabilities.LayerSpec);
    const handlerSets = yield* Capability.getAll(Capabilities.OperationHandler);
    const traceSinkFactories = yield* Capability.getAll(Capabilities.TraceSink);

    const layerStack = new LayerStack({ layers: [...layerSpecs] });
    const serviceResolver = layerStack.getServiceResolver();

    const handlerSet =
      handlerSets.length === 0 ? OperationHandlerSet.empty : OperationHandlerSet.merge(...handlerSets);

    const traceSinks = traceSinkFactories.map((factory) => factory({ resolver: serviceResolver }));
    const mergedTraceSink = Trace.mergeSinks(traceSinks);

    // Base services required by ProcessManager and the operation invoker.
    // Sensible defaults are provided here; plugins that want alternative
    // implementations (e.g. persistent KV store, real tracing) can contribute
    // their own LayerSpec entries against the ServiceResolver.
    const baseLayer = Layer.mergeAll(
      Layer.succeed(Capability.Service, capabilityManager),
      Layer.succeed(Plugin.Service, pluginManager),
      Layer.succeed(Registry.AtomRegistry, atomRegistry),
      Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver),
      OperationHandlerSet.provide(handlerSet),
      KeyValueStore.layerMemory,
      Layer.succeed(Trace.TraceSink, mergedTraceSink),
    );

    const processManagerLayer = ProcessManager.layer().pipe(Layer.provide(baseLayer));
    const operationInvokerLayer = ProcessManager.ProcessOperationInvoker.layer.pipe(
      Layer.provide(Layer.mergeAll(processManagerLayer, baseLayer)),
    );

    const runtimeLayer = Layer.mergeAll(baseLayer, processManagerLayer, operationInvokerLayer);

    const managedRuntime = ManagedRuntime.make(runtimeLayer as Layer.Layer<any, any, never>);

    // Dispose the managed runtime — and its scoped process manager, service
    // resolver, trace sinks, etc. — when this capability module is torn down.
    yield* Effect.addFinalizer(() =>
      Effect.promise(() => managedRuntime.dispose()).pipe(Effect.catchAllCause(() => Effect.void)),
    );

    const processManagerRuntime: Capabilities.ProcessManagerRuntime = {
      runPromise: (effect, options) => managedRuntime.runPromise(effect as Effect.Effect<any, any, any>, options),
      runPromiseExit: (effect, options) =>
        managedRuntime.runPromiseExit(effect as Effect.Effect<any, any, any>, options),
      runFork: (effect, options) => managedRuntime.runFork(effect as Effect.Effect<any, any, any>, options),
      runSync: (effect) => managedRuntime.runSync(effect as Effect.Effect<any, any, any>),
    };

    // Eagerly extract the process monitor. Safe because it does not require a
    // fresh scope and is a stable reference for the lifetime of the runtime.
    const processMonitor = managedRuntime.runSync(
      Effect.flatMap(Process.ProcessMonitorService, Effect.succeed) as Effect.Effect<Process.Monitor, never, never>,
    );

    // Eagerly extract the operation invoker built by ProcessOperationInvoker.layer.
    const operationInvoker = managedRuntime.runSync(
      Effect.flatMap(Operation.Service, Effect.succeed) as Effect.Effect<Operation.OperationService, never, never>,
    );

    return [
      Capability.contributes(Capabilities.ProcessManagerRuntime, processManagerRuntime),
      Capability.contributes(Capabilities.ServiceResolver, serviceResolver),
      Capability.contributes(Capabilities.ProcessMonitor, processMonitor),
      Capability.contributes(Capabilities.OperationInvoker, operationInvoker),
    ];
  }),
);
