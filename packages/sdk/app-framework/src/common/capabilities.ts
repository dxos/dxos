//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Exit$ from 'effect/Exit';
import type * as Fiber$ from 'effect/Fiber';
import type * as Layer$ from 'effect/Layer';
import type * as ManagedRuntime$ from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import type * as Tracer$ from 'effect/Tracer';
import type * as Command$ from 'effect/unstable/cli/Command';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import type { FC, PropsWithChildren } from 'react';

import type {
  ProcessManager as ProcessManager$,
  RemoteTraceMonitor as RemoteTraceMonitor$,
} from '@dxos/compute-runtime';
import * as LayerSpec$ from '@dxos/compute/LayerSpec';
import * as Operation$ from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process$ from '@dxos/compute/Process';
import * as ServiceResolver$ from '@dxos/compute/ServiceResolver';
import * as Trace$ from '@dxos/compute/Trace';
import { OperationInvoker as OperationInvoker$ } from '@dxos/operation';

import { Capability as Capability$, Plugin as Plugin$, type PluginManager as PluginManager$ } from '../core';
import type {
  HistoryTracker as HistoryTracker$,
  UndoMapping as UndoMapping$,
  UndoRegistry as UndoRegistry$,
} from '../plugin-process-manager';
import type { Surface } from '../ui';

/**
 * @category Capability
 */
export const PluginManager = Capability$.makeSingleton<PluginManager$.PluginManager>()(
  'org.dxos.app-framework.capability.pluginManager',
);

/**
 * @category Capability
 */
export const AtomRegistry = Capability$.makeSingleton<Registry.AtomRegistry>()(
  'org.dxos.app-framework.capability.atomRegistry',
);

export type ReactContext = Readonly<{
  id: string;
  dependsOn?: string[];
  context: FC<PropsWithChildren>;
}>;

/**
 * @category Capability
 */
export const ReactContext = Capability$.make<ReactContext>()('org.dxos.app-framework.capability.reactContext');

export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;

/**
 * @category Capability
 */
export const ReactRoot = Capability$.make<ReactRoot>()('org.dxos.app-framework.capability.reactRoot');

/**
 * Surface definitions that can be either React components or Web Components.
 */
export type ReactSurface = Surface.Definition | readonly Surface.Definition[];

/**
 * @category Capability
 */
export const ReactSurface = Capability$.make<ReactSurface>()('org.dxos.app-framework.capability.reactSurface');

// The requirement channel stays open: a command's services are supplied partly by the contributing
// plugin and partly by the host — `CommandConfig` carries the host's global flags and is provided as
// an ambient layer by the host binary — so no single side can discharge them all. `CommandServices`
// in @dxos/cli-util names what a host owes; hosts should type their layer with it.
export type AnyCommand = Command$.Command<any, any, any, any, any>;

/**
 * @category Capability
 */
export const Command = Capability$.make<AnyCommand>()('org.dxos.app-framework.capability.command');

/**
 * @category Capability
 */
// The input channel is closed: a contributed layer is merged into whatever a host is assembling, so
// it has to carry its own requirements rather than expect the host to satisfy them.
export const Layer = Capability$.make<Layer$.Layer<any, any, never>>()('org.dxos.app-framework.capability.layer');

/**
 * Layer specification contributed by plugins.
 *
 * Plugins contribute {@link LayerSpec.LayerSpec} entries that are collected by the
 * process-manager module and composed into a {@link LayerStack} which backs the
 * {@link ProcessManagerRuntime}'s service resolver.
 *
 * @category Capability
 */
export const LayerSpec = Capability$.make<LayerSpec$.LayerSpec>()('org.dxos.app-framework.capability.layerSpec');

/**
 * Context passed to {@link TraceSinkFactory} implementations when the
 * process-manager capability materialises contributed sinks.
 */
export interface TraceSinkFactoryContext {
  /**
   * Service resolver backing the shared {@link ProcessManagerRuntime}. Use it
   * to resolve per-space (or per-process) services like `FeedTraceSink` when
   * building a routing sink.
   */
  readonly resolver: ServiceResolver$.ServiceResolver;
}

/**
 * Factory that builds a {@link Trace$.Sink} when the process-manager
 * capability is ready. Plugins that only need a static sink can ignore the
 * context (e.g. `() => myConsoleSink`); plugins that need per-space routing
 * can use {@link TraceSinkFactoryContext.resolver} to look up services.
 */
export type TraceSinkFactory = (ctx: TraceSinkFactoryContext) => Trace$.Sink;

/**
 * Trace sink contribution.
 *
 * Plugins contribute {@link TraceSinkFactory} functions; the process-manager
 * capability invokes each factory with the runtime's
 * {@link ServiceResolver$.ServiceResolver}, collects the resulting
 * {@link Trace$.Sink}s, merges them via {@link Trace$.mergeSinks}, and
 * installs the merged sink as {@link Trace$.TraceSink} in the runtime layer
 * so every process writes to every contributed sink.
 *
 * @category Capability
 */
export const TraceSink = Capability$.make<TraceSinkFactory>()('org.dxos.app-framework.capability.traceSink');

/**
 * Effect layer installed into the {@link ProcessManagerRuntime}, for services every fiber running
 * on it should inherit — a `Tracer` exporting the spans the code already emits, and anything it
 * needs (e.g. `Telemetry.CurrentSpanTransformer`). Contributions are merged, so the app chooses a
 * telemetry backend without any subsystem knowing which one, or that there is one.
 *
 * @category Capability
 */
export const RuntimeServices = Capability$.make<Layer$.Layer<never>>()(
  'org.dxos.app-framework.capability.runtimeServices',
);

/** Re-exported so a contributor can type its layer without depending on effect's Tracer path. */
export type Tracer = Tracer$.Tracer;

/**
 * Source of ephemeral trace messages broadcast by remote runtimes over the space swarm (DX-1125).
 * Contributed by a client-aware plugin; the process-manager capability wires the first contribution
 * (or a no-op) into the aggregate {@link ProcessMonitor} so its `subscribeToTraceMessages` surfaces
 * remote progress alongside local.
 *
 * @category Capability
 */
export const RemoteTraceMonitor = Capability$.make<RemoteTraceMonitor$.Monitor>()(
  'org.dxos.app-framework.capability.remoteTraceMonitor',
);

/**
 * Service resolver backing the shared {@link ProcessManagerRuntime}.
 *
 * Contributed by the process-manager capability module. Consumers can combine
 * it with {@link ServiceResolver$.provide} to build space-scoped layers without
 * having to go through the process-manager runtime:
 *
 * @example
 * ```ts
 * const resolver = yield* Capability.get(Capabilities.ServiceResolver);
 * yield* effect.pipe(
 *   Effect.provide(
 *     ServiceResolver.provide({ space }, Database.Service).pipe(
 *       Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
 *     ),
 *   ),
 * );
 * ```
 *
 * @category Capability
 */
export const ServiceResolver = Capability$.makeSingleton<ServiceResolver$.ServiceResolver>()(
  'org.dxos.app-framework.capability.serviceResolver',
);

/**
 * Process monitor backing the shared {@link ProcessManagerRuntime}. Exposes the
 * live process tree (including inactive/terminated entries) via
 * {@link Process$.Monitor#processTreeAtom}.
 *
 * @category Capability
 */
export const ProcessMonitor = Capability$.makeSingleton<Process$.Monitor>()(
  'org.dxos.app-framework.capability.processMonitor',
);

/**
 * Services that are always available when running effects through a {@link ProcessManagerRuntime}.
 */
export type ProcessManagerRuntimeServices =
  | Capability$.Service
  | Plugin$.Service
  | ProcessManager$.ProcessManagerService
  | Operation$.Service
  | ProcessManager$.ProcessOperationInvoker.Service
  | ServiceResolver$.ServiceResolver;

/**
 * Runtime that runs effects requiring a fixed set of capability-manager and
 * process-manager services.
 *
 * The shape mirrors {@link ManagedRuntime$.ManagedRuntime} but deliberately does
 * not expose `dispose` – lifecycle is driven by the host plugin manager.
 */
export interface ProcessManagerRuntime {
  runPromise<A, E>(
    effect: Effect.Effect<A, E, ProcessManagerRuntimeServices>,
    options?: { readonly signal?: AbortSignal },
  ): Promise<A>;
  runPromiseExit<A, E>(
    effect: Effect.Effect<A, E, ProcessManagerRuntimeServices>,
    options?: { readonly signal?: AbortSignal },
  ): Promise<Exit$.Exit<A, E>>;
  runFork<A, E>(
    effect: Effect.Effect<A, E, ProcessManagerRuntimeServices>,
    options?: Effect.RunOptions,
  ): Fiber$.Fiber<A, E>;
  runSync<A, E>(effect: Effect.Effect<A, E, ProcessManagerRuntimeServices>): A;
}

/**
 * @category Capability
 */
export const ProcessManagerRuntime = Capability$.makeSingleton<ProcessManagerRuntime>()(
  'org.dxos.app-framework.capability.processManagerRuntime',
);

export type ManagedRuntime = ManagedRuntime$.ManagedRuntime<any, any>;

/**
 * @category Capability
 */
export const ManagedRuntime = Capability$.makeSingleton<ManagedRuntime>()(
  'org.dxos.app-framework.capability.managedRuntime',
);

//
// Operation System Capabilities
//

export const OperationHandler = Capability$.make<OperationHandlerSet.OperationHandlerSet>()(
  'org.dxos.app-framework.capability.operationHandler',
);

export type UndoMapping = UndoMapping$.UndoMapping;

/**
 * Undo mapping registration - contributed by plugins.
 * @category Capability
 */
export const UndoMapping = Capability$.make<UndoMapping[]>()('org.dxos.app-framework.capability.undoMapping');

/**
 * Operation invoker backed by the process manager. Spawns a process per
 * operation invocation; see {@link ProcessManager$.ProcessOperationInvoker}.
 */
export type OperationInvoker = OperationInvoker$.OperationInvoker;

/**
 * Operation invoker - provided by the process-manager capability.
 * @category Capability
 */
export const OperationInvoker = Capability$.makeSingleton<OperationInvoker>()(
  'org.dxos.app-framework.capability.operationInvoker',
);

export type UndoRegistry = UndoRegistry$.UndoRegistry;

/**
 * Undo registry - provided by ProcessManagerPlugin.
 * @category Capability
 */
export const UndoRegistry = Capability$.makeSingleton<UndoRegistry>()('org.dxos.app-framework.capability.undoRegistry');

export type HistoryTracker = HistoryTracker$.HistoryTracker;

/**
 * History tracker - provided by ProcessManagerPlugin.
 * @category Capability
 */
export const HistoryTracker = Capability$.makeSingleton<HistoryTracker>()(
  'org.dxos.app-framework.capability.historyTracker',
);

//
// Atom Capability Helpers
//

/**
 * Get the current value of an atom capability.
 * @example const settings = yield* Capabilities.getAtomValue(CommentCapabilities.Settings);
 */
export const getAtomValue = <T>(
  atomCapability: Capability$.InterfaceDef<Atom.Atom<T>>,
): Effect.Effect<T, Error, Capability$.Service> =>
  Effect.gen(function* () {
    const registry = yield* Capability$.get(AtomRegistry);
    const atom = yield* Capability$.get(atomCapability);
    return registry.get(atom);
  });

/**
 * Get the current value of an atom capability, or `Option.none()` when either the registry or the
 * atom itself is uncontributed.
 *
 * For operations that run on both the app and a headless host (the edge operation-service, `dx mcp
 * serve`): those hosts have a capability manager but activate no UI plugins, so {@link getAtomValue}
 * fails on capabilities like `Layout` that only the app contributes.
 *
 * @example const layout = yield* Capabilities.getAtomValueOption(AppCapabilities.Layout);
 */
export const getAtomValueOption = <T>(
  atomCapability: Capability$.InterfaceDef<Atom.Atom<T>>,
): Effect.Effect<Option.Option<T>, never, Capability$.Service> =>
  Effect.gen(function* () {
    const registry = yield* Capability$.getOption(AtomRegistry);
    const atom = yield* Capability$.getOption(atomCapability);
    return Option.map(Option.all([registry, atom]), ([registry, atom]) => registry.get(atom));
  });

/**
 * Update an atom capability value (requires writable atom).
 * @example yield* Capabilities.updateAtomValue(CommentCapabilities.Settings, (s) => ({ ...s, foo: true }));
 */
export const updateAtomValue = <T>(
  atomCapability: Capability$.InterfaceDef<Atom.Writable<T>>,
  fn: (current: T) => T,
): Effect.Effect<void, Error, Capability$.Service> =>
  Effect.gen(function* () {
    const registry = yield* Capability$.get(AtomRegistry);
    const atom = yield* Capability$.get(atomCapability);
    registry.set(atom, fn(registry.get(atom)));
  });

/**
 * Subscribe to an atom capability.
 * @example const unsubscribe = yield* Capabilities.subscribeAtom(CommentCapabilities.Settings, (value) => ...);
 */
export const subscribeAtom = <T>(
  atomCapability: Capability$.InterfaceDef<Atom.Atom<T>>,
  callback: (value: T) => void,
): Effect.Effect<() => void, Error, Capability$.Service> =>
  Effect.gen(function* () {
    const registry = yield* Capability$.get(AtomRegistry);
    const atom = yield* Capability$.get(atomCapability);
    return registry.subscribe(atom, () => callback(registry.get(atom)));
  });
