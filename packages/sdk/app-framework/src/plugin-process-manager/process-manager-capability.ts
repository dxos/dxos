//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import * as Tracer from 'effect/Tracer';

import {
  LayerStack,
  ProcessManager,
  ProcessOperationInvoker,
  RemoteProcessManager,
  RemoteTraceMonitor,
  UnifiedProcessManager,
} from '@dxos/compute-runtime';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import * as OtelTracer from '@dxos/effect/OtelTracer';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import { OperationInvoker } from '@dxos/operation';

import { Capabilities } from '../common/index.ts';
import { Capability, Plugin } from '../core/index.ts';
import { layerIdb } from './idb-key-value-store.ts';

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
//    service resolution; specs contributed later are added to the live stack.
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

/**
 * The application's one {@link Process.ManagerService}, as built by the stack. Every built-in and plugin
 * consumer sees the same manager, so a host's remote manager (e.g. EDGE) reaches the app's invoker too.
 */
const ProcessManagerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [
      ProcessManager.ProcessManagerService,
      RemoteProcessManager.Service,
      RemoteTraceMonitor.Service,
      Registry.AtomRegistry,
    ],
    provides: [Process.ManagerService],
  },
  () => UnifiedProcessManager.layer,
);

/**
 * A {@link Process.Manager} that is the stack's {@link Process.ManagerService}, resolved on first use: building it
 * resolves the host's remote manager, which may need services (the client) that are not ready at activation.
 * The process tree reads empty until then.
 */
export const fromStack = (
  resolver: ServiceResolver.ServiceResolver,
  scope: Scope.Scope,
  registry: Registry.AtomRegistry,
): Process.Manager => {
  const resolvedAtom = Atom.make<Process.Manager | undefined>(undefined).pipe(Atom.keepAlive);
  const manager: Effect.Effect<Process.Manager> = Effect.suspend(() => {
    const resolved = registry.get(resolvedAtom);
    return resolved !== undefined
      ? Effect.succeed(resolved)
      : resolver.resolve(Process.ManagerService, {}).pipe(
          Scope.provide(scope),
          Effect.tap((stackManager) => Effect.sync(() => registry.set(resolvedAtom, stackManager))),
          // The framework's own spec provides it, so a failure here is a broken stack, not a missing plugin.
          Effect.orDie,
        );
  });

  return {
    processTree: Effect.flatMap(manager, (stackManager) => stackManager.processTree),
    processTreeAtom: Atom.make((get) => {
      const stackManager = get(resolvedAtom);
      return stackManager === undefined ? [] : get(stackManager.processTreeAtom);
    }),
    list: (filter) => Effect.flatMap(manager, (stackManager) => stackManager.list(filter)),
    subscribeToTraceMessages: (filter) =>
      Stream.unwrap(Effect.map(manager, (stackManager) => stackManager.subscribeToTraceMessages(filter))),
    spawn: (definition, options) => Effect.flatMap(manager, (stackManager) => stackManager.spawn(definition, options)),
    handles: (options) => Effect.flatMap(manager, (stackManager) => stackManager.handles(options)),
    attach: (pid, options) => Effect.flatMap(manager, (stackManager) => stackManager.attach(pid, options)),
  };
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
    // Startup soft-ordering makes same-pass providers visible here; specs contributed later (a
    // plugin enabled after boot) join the live stack through the subscription below.
    const layerSpecs = layerSpecContributions.get();
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

    // Fallbacks for a host with no remote runtime; a plugin spec providing either tag (e.g. EDGE's) wins.
    const fallbacks = Effect.runSync(
      Effect.gen(function* () {
        const remoteProcessManager = yield* RemoteProcessManager.Service;
        const remoteTraceMonitor = yield* RemoteTraceMonitor.Service;
        return Context.make(RemoteProcessManager.Service, remoteProcessManager).pipe(
          Context.add(RemoteTraceMonitor.Service, remoteTraceMonitor),
        );
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            RemoteProcessManager.layerNoop,
            // Remote ephemeral trace (DX-1125): the first contributed swarm-backed monitor, else no-op.
            remoteTraceMonitors.length > 0
              ? Layer.succeed(RemoteTraceMonitor.Service, remoteTraceMonitors[0])
              : RemoteTraceMonitor.layerNoop,
          ),
        ),
        Effect.provideService(Registry.AtomRegistry, atomRegistry),
      ),
    );

    const layerStack = new LayerStack.LayerStack({
      layers: [ambientLayerSpec, ProcessManagerSpec, ...layerSpecs],
      services: fallbacks,
    });
    const serviceResolver = layerStack.getServiceResolver();

    // The stack extends built slices in place, so admitting a late spec costs no live service.
    const rejectedLayerSpecs = new WeakSet<LayerSpec.LayerSpec>();
    const admitLayerSpecs = (specs: readonly LayerSpec.LayerSpec[]) => {
      const candidates = specs.filter((spec) => !rejectedLayerSpecs.has(spec));
      try {
        layerStack.addLayers(candidates);
      } catch {
        // Admitted one at a time so a single bad spec does not keep the others out.
        for (const spec of candidates) {
          try {
            layerStack.addLayers([spec]);
          } catch (err) {
            rejectedLayerSpecs.add(spec);
            log.error('LayerSpec rejected', { provides: spec.provides.map((tag) => tag.key), err });
          }
        }
      }
    };
    const cancelLayerSpecWatch = atomRegistry.subscribe(layerSpecContributions.atom, admitLayerSpecs);
    yield* Effect.addFinalizer(() => Effect.sync(cancelLayerSpecWatch));
    // Covers a contribution landing between the snapshot above and the subscription.
    admitLayerSpecs(layerSpecContributions.get());

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
      Layer.succeed(Tracer.Tracer, OtelTracer.makeGlobal('@dxos/app-framework/process-manager')),
    );

    const processManagerLayer = ProcessManager.layer({ runtimeName: Trace.CommonRuntimeName.local }).pipe(
      Layer.provide(baseLayer),
    );
    // Holds the stack's application slice that the manager resolves from, for the module's lifetime.
    const stackScope = yield* Scope.make();
    yield* Effect.addFinalizer(() => Scope.close(stackScope, Exit.void));
    const unifiedProcessManagerLayer = Layer.succeed(
      Process.ManagerService,
      fromStack(serviceResolver, stackScope, atomRegistry),
    );
    const operationInvokerLayer = ProcessOperationInvoker.layer.pipe(
      // Operations invoked through the app's own invoker are the person's actions, from a menu, dialog or shortcut.
      Layer.provide(Layer.mergeAll(unifiedProcessManagerLayer, baseLayer, Layer.succeed(Database.Origin, 'user'))),
    );

    const runtimeLayer = Layer.mergeAll(
      baseLayer,
      processManagerLayer,
      operationInvokerLayer,
      unifiedProcessManagerLayer,
    );

    const managedRuntime = ManagedRuntime.make(runtimeLayer as Layer.Layer<any, any, never>);

    // The module scope closes on deactivation/shutdown: dispose the runtime, then tear
    // down the stack's keep-alive slices.
    yield* Effect.addFinalizer(() =>
      Effect.promise(() => managedRuntime.dispose()).pipe(Effect.andThen(layerStack.destroy())),
    );

    const processManagerRuntime: Capabilities.ProcessManagerRuntime = {
      runPromise: (effect, options) => managedRuntime.runPromise(effect as Effect.Effect<any, any, any>, options),
      runPromiseExit: (effect, options) =>
        managedRuntime.runPromiseExit(effect as Effect.Effect<any, any, any>, options),
      runFork: (effect, options) => managedRuntime.runFork(effect as Effect.Effect<any, any, any>, options),
      runSync: (effect) => managedRuntime.runSync(effect as Effect.Effect<any, any, any>),
    };

    // Eagerly extract the process manager. Safe because it does not require a
    // fresh scope and is a stable reference for the lifetime of the runtime.
    const unifiedProcessManager = managedRuntime.runSync(
      Effect.flatMap(Process.ManagerService, Effect.succeed) as Effect.Effect<Process.Manager, never, never>,
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

    // Resolved in the background rather than on first spawn, so a view that only reads the tree still fills in;
    // after the holder above, which the stack's manager is built over.
    managedRuntime.runFork(unifiedProcessManager.processTree);

    // Eagerly extract the operation invoker built by ProcessOperationInvoker.layer, via its own tag so the
    // contributed value carries the full OperationInvoker interface (`invocations`, `pendingFollowups`,
    // `awaitFollowups`, `_invokeCore`) that HistoryTracker requires.
    const operationInvoker: OperationInvoker.OperationInvoker = managedRuntime.runSync(
      Effect.flatMap(ProcessOperationInvoker.Service, Effect.succeed) as Effect.Effect<
        ProcessOperationInvoker.ProcessOperationInvoker,
        never,
        never
      >,
    );

    return [
      Capability.contribute(Capabilities.ProcessManagerRuntime, processManagerRuntime),
      Capability.contribute(Capabilities.ServiceResolver, serviceResolver),
      Capability.contribute(Capabilities.ProcessManager, unifiedProcessManager),
      Capability.contribute(Capabilities.OperationInvoker, operationInvoker),
      Capability.contribute(Capabilities.OperationHandlers, handlerSet),
    ];
  }),
);
