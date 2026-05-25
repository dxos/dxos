//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { LayerSpec, OperationHandlerSet, Process, ServiceResolver, Trace } from '@dxos/compute';
import { LayerStack, ProcessManager } from '@dxos/compute-runtime';
import { invariant } from '@dxos/invariant';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import { OperationInvoker } from '@dxos/operation';

import { ActivationEvents, Capabilities } from '../common';
import { Capability, Plugin } from '../core';

//
// Capability Module
//
// Hosts the {@link ProcessManager} runtime for the plugin system.
//
// Workflow:
// 1. Activates {@link ActivationEvents.SetupProcessManager} so plugins can
//    contribute {@link Capabilities.LayerSpec} entries and
//    {@link Capabilities.OperationHandler} sets.
// 2. Collects all contributed {@link LayerSpec.LayerSpec}s and builds a
//    {@link LayerStack} whose {@link ServiceResolver} drives process-scoped
//    service resolution.
// 3. Wires a reactive {@link OperationHandlerSet} that tracks
//    {@link Capabilities.OperationHandler} contributions and invalidates its
//    cached merge when new handlers register.
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

    yield* Plugin.activate(ActivationEvents.SetupProcessManager);

    const layerSpecs = yield* Capability.getAll(Capabilities.LayerSpec);
    const traceSinkFactories = yield* Capability.getAll(Capabilities.TraceSink);

    // Forward reference to `ProcessManager.ProcessManagerService`. The runtime
    // that owns the manager depends transitively on `ServiceResolver` (which is
    // built from the `LayerStack` below), so we cannot materialise it before
    // the stack exists. Instead we publish the manager into this holder as
    // soon as the runtime is built, and the ambient layer reads it lazily via
    // `Layer.effect` — slice init only runs once a process actually triggers
    // service resolution, by which point the holder is populated.
    let processManagerHolder: ProcessManager.Manager | undefined;

    // Expose the foundational app-framework services through the LayerStack so
    // that operations declaring `services: [Capability.Service]` (and friends)
    // can resolve them via the ServiceResolver. Without this, only consumers
    // sitting on the same ManagedRuntime layer graph can see them — process
    // executions go through ServiceResolver.resolveAll and would fail.
    const ambientLayerSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [Capability.Service, Plugin.Service, Registry.AtomRegistry, ProcessManager.ProcessManagerService],
      },
      () =>
        Layer.mergeAll(
          Layer.succeed(Capability.Service, capabilityManager),
          Layer.succeed(Plugin.Service, pluginManager),
          Layer.succeed(Registry.AtomRegistry, atomRegistry),
          Layer.effect(
            ProcessManager.ProcessManagerService,
            Effect.sync(() => {
              invariant(
                processManagerHolder,
                'ProcessManagerService accessed before the process-manager runtime was initialised',
              );
              return processManagerHolder;
            }),
          ),
        ),
    );

    const layerStack = new LayerStack.LayerStack({ layers: [ambientLayerSpec, ...layerSpecs] });
    const serviceResolver = layerStack.getServiceResolver();

    const handlerSet = OperationHandlerSet.reactive(
      atomRegistry,
      capabilityManager.atom(Capabilities.OperationHandler),
    );

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

    const processManagerLayer = ProcessManager.layer({ runtimeName: Trace.CommonRuntimeName.local }).pipe(
      Layer.provide(baseLayer),
    );
    const operationInvokerLayer = ProcessManager.ProcessOperationInvoker.layer.pipe(
      Layer.provide(Layer.mergeAll(processManagerLayer, baseLayer)),
    );

    const runtimeLayer = Layer.mergeAll(baseLayer, processManagerLayer, operationInvokerLayer);

    const managedRuntime = ManagedRuntime.make(runtimeLayer as Layer.Layer<any, any, never>);

    // TODO(dmaretskyi): Capability modules don't currently expose a teardown
    // hook (`makeModule` only allows `Service | Plugin.Service` in the effect's
    // requirements, ruling out `Effect.addFinalizer`). Once the plugin
    // framework grows a shutdown lifecycle, dispose `managedRuntime` and then
    // call `layerStack.destroy()` to tear down keep-alive slices.

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

    // Publish the manager into the ambient-layer holder so that
    // `ProcessManager.ProcessManagerService` becomes resolvable through the
    // LayerStack alongside the other framework-supplied services.
    processManagerHolder = managedRuntime.runSync(
      Effect.flatMap(ProcessManager.ProcessManagerService, Effect.succeed) as Effect.Effect<
        ProcessManager.Manager,
        never,
        never
      >,
    );

    // Eagerly extract the operation invoker built by ProcessOperationInvoker.layer.
    // Pulled via the ProcessOperationInvoker tag so the contributed value carries
    // the full OperationInvoker interface (`invocations`, `pendingFollowups`,
    // `awaitFollowups`, `_invokeCore`) that HistoryTracker requires.
    const operationInvoker: OperationInvoker.OperationInvoker = managedRuntime.runSync(
      Effect.flatMap(ProcessManager.ProcessOperationInvoker.Service, Effect.succeed) as unknown as Effect.Effect<
        OperationInvoker.OperationInvoker,
        never,
        never
      >,
    );

    return [
      Capability.contributes(Capabilities.ProcessManagerRuntime, processManagerRuntime),
      Capability.contributes(Capabilities.ServiceResolver, serviceResolver),
      Capability.contributes(Capabilities.ProcessMonitor, processMonitor),
      Capability.contributes(Capabilities.OperationInvoker, operationInvoker),
    ];
  }),
);
