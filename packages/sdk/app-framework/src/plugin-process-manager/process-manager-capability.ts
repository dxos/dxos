//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Tracer from 'effect/Tracer';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import {
  LayerStack,
  ProcessManager,
  ProcessMonitor,
  RemoteProcessManager,
  RemoteTraceMonitor,
} from '@dxos/compute-runtime';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { makeGlobalTracer } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import { OperationInvoker } from '@dxos/operation';

import { Capabilities } from '../common';
import { Capability, Plugin } from '../core';
import { layerIdb } from './idb-key-value-store';

//
// Capability Module
//
// Hosts the {@link ProcessManager} runtime for the plugin system.
//
// Workflow:
// 1. Requires {@link Capabilities.LayerSpec} and {@link Capabilities.OperationHandler}
//    contributions from dependency-mode modules.
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

/**
 * Trace sink over the LIVE contribution list, so a sink contributed after the runtime was built (an
 * on-demand module, like plugin-progress's adapter) still observes writes. Instances are cached per
 * factory, since a sink may hold state across writes and must not be rebuilt underneath itself.
 */
export const makeDynamicTraceSink = (
  getFactories: () => readonly Capabilities.TraceSinkFactory[],
  resolver: ServiceResolver.ServiceResolver,
): Trace.Sink => {
  const instances = new Map<Capabilities.TraceSinkFactory, Trace.Sink>();
  const resolve = (): Trace.Sink[] => {
    const sinks: Trace.Sink[] = [];
    for (const factory of getFactories()) {
      const existing = instances.get(factory);
      if (existing) {
        sinks.push(existing);
        continue;
      }
      try {
        const sink = factory({ resolver });
        instances.set(factory, sink);
        sinks.push(sink);
      } catch (err) {
        // One factory that cannot build must not cost the sinks behind it their messages.
        log.warn('trace sink factory failed', { err });
      }
    }
    return sinks;
  };

  // `mergeSinks` per write, for its guarantee that one throwing sink cannot break the chain.
  return { write: (message) => Trace.mergeSinks(resolve()).write(message) };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const pluginManager = yield* Plugin.Service;
    const atomRegistry = yield* Capabilities.AtomRegistry;

    const layerSpecContributions = yield* Capabilities.LayerSpec;
    const traceSinkContributions = yield* Capabilities.TraceSink;
    const operationHandlerContributions = yield* Capabilities.OperationHandler;
    const remoteTraceMonitorContributions = yield* Capabilities.RemoteTraceMonitor;
    // One-shot snapshot: startup soft-ordering makes same-pass providers visible; entries
    // contributed by plugins enabled later do not join the stack (same as the event window).
    const layerSpecs = layerSpecContributions.get();

    const warnOnLateContribution = <T>(capability: Capability.InterfaceDef<T>, label: string, fix: string) => {
      const atom = capabilityManager.atomByModule(capability);
      const modulesAtSnapshot = new Set(Object.keys(atomRegistry.get(atom)));
      return atomRegistry.subscribe(atom, (byModule) => {
        for (const moduleId of Object.keys(byModule)) {
          if (!modulesAtSnapshot.has(moduleId)) {
            modulesAtSnapshot.add(moduleId);
            log.error(`${label} contributed after the runtime was built — it is ignored until the next boot`, {
              module: moduleId,
              fix,
            });
          }
        }
      });
    };

    const cancelLateContributionWatches = [
      warnOnLateContribution(
        Capabilities.LayerSpec,
        'LayerSpec',
        'contribute it with AppCapability.layerSpec (or declare activatesOn: ActivationEvents.Startup)',
      ),
    ];
    yield* Effect.addFinalizer(() => Effect.sync(() => cancelLateContributionWatches.forEach((cancel) => cancel())));
    // Optional swarm-backed remote trace source (DX-1125); first contribution wins, else empty.
    const remoteTraceMonitors = remoteTraceMonitorContributions.get();

    log.info('setup process manager', { traceSinks: traceSinkContributions.get().length });

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

    // Handler sets register eagerly at startup (keyed sets defer only handler BODIES), so the
    // reactive view over contributions is complete at boot — no demand pull on a miss.
    const handlerSet = OperationHandlerSet.reactive(atomRegistry, operationHandlerContributions.atom);

    const mergedTraceSink = makeDynamicTraceSink(() => traceSinkContributions.get(), serviceResolver);

    // Base services required by ProcessManager and the operation invoker.
    // Sensible defaults are provided here; plugins that want alternative
    // implementations (e.g. persistent KV store) can contribute their own LayerSpec entries
    // against the ServiceResolver.
    const baseLayer = Layer.mergeAll(
      Layer.succeed(Capability.Service, capabilityManager),
      Layer.succeed(Plugin.Service, pluginManager),
      Layer.succeed(Registry.AtomRegistry, atomRegistry),
      Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver),
      OperationHandlerSet.provide(handlerSet),
      layerIdb,
      Layer.succeed(Trace.TraceSink, mergedTraceSink),
      // Over the OTel global provider, a proxy that no-ops until one is registered, so this is
      // installed whether or not observability exists.
      Layer.succeed(Tracer.Tracer, makeGlobalTracer('@dxos/app-framework/process-manager')),
    );

    const processManagerLayer = ProcessManager.layer({ runtimeName: Trace.CommonRuntimeName.local }).pipe(
      Layer.provide(baseLayer),
    );
    const operationInvokerLayer = ProcessManager.ProcessOperationInvoker.layer.pipe(
      Layer.provide(Layer.mergeAll(processManagerLayer, baseLayer)),
    );

    // App-framework has no EDGE runtime, so the remote process view is empty;
    // the aggregate monitor therefore equals the local process tree.
    const remoteProcessManagerLayer = RemoteProcessManager.layerNoop.pipe(Layer.provide(baseLayer));
    // Remote ephemeral trace (DX-1125): use the first contributed swarm-backed monitor, else no-op.
    const remoteTraceMonitorLayer =
      remoteTraceMonitors.length > 0
        ? Layer.succeed(RemoteTraceMonitor.Service, remoteTraceMonitors[0])
        : RemoteTraceMonitor.layerNoop;
    const processMonitorLayer = ProcessMonitor.layer.pipe(
      Layer.provide(Layer.mergeAll(processManagerLayer, remoteProcessManagerLayer, remoteTraceMonitorLayer, baseLayer)),
    );

    const runtimeLayer = Layer.mergeAll(baseLayer, processManagerLayer, operationInvokerLayer, processMonitorLayer);

    const managedRuntime = ManagedRuntime.make(runtimeLayer as Layer.Layer<any, any, never>);

    // The module scope closes on deactivation/shutdown: dispose the runtime, then tear
    // down the stack's keep-alive slices.
    yield* Effect.addFinalizer(() =>
      Effect.promise(() => managedRuntime.dispose()).pipe(Effect.andThen(Effect.promise(() => layerStack.destroy()))),
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
      Capability.contribute(Capabilities.ProcessManagerRuntime, processManagerRuntime),
      Capability.contribute(Capabilities.ServiceResolver, serviceResolver),
      Capability.contribute(Capabilities.ProcessMonitor, processMonitor),
      Capability.contribute(Capabilities.OperationInvoker, operationInvoker),
      Capability.contribute(Capabilities.OperationHandlers, handlerSet),
    ];
  }),
);
