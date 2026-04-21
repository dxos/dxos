//
// Copyright 2025 DXOS.org
//

import { type Atom, type Registry } from '@effect-atom/atom-react';
import type * as Command$ from '@effect/cli/Command';
import type * as Exit$ from 'effect/Exit';
import type * as Fiber$ from 'effect/Fiber';
import * as Effect from 'effect/Effect';
import type * as Layer$ from 'effect/Layer';
import type * as ManagedRuntime$ from 'effect/ManagedRuntime';
import type * as Runtime$ from 'effect/Runtime';
import type { FC, PropsWithChildren } from 'react';

import type { ProcessManager as ProcessManager$ } from '@dxos/compute-runtime';
import type {
  LayerSpec as LayerSpec$,
  Process as Process$,
  ServiceResolver as ServiceResolver$,
  Trace as Trace$,
} from '@dxos/functions';
import { Operation as Operation$ } from '@dxos/operation';
import type { OperationInvoker as OperationInvoker$, OperationHandlerSet } from '@dxos/operation';

import { Capability as Capability$, Plugin as Plugin$, type PluginManager as PluginManager$ } from '../core';
import type {
  HistoryTracker as HistoryTracker$,
  UndoMapping as UndoMapping$,
  UndoRegistry as UndoRegistry$,
} from '../plugin-operation';
import type { Surface } from '../ui';

/**
 * Null capability.
 * @category Capability
 */
export const Null = Capability$.make<null>('org.dxos.app-framework.capability.null');

/**
 * @category Capability
 */
export const PluginManager = Capability$.make<PluginManager$.PluginManager>(
  'org.dxos.app-framework.capability.plugin-manager',
);

/**
 * @category Capability
 */
export const AtomRegistry = Capability$.make<Registry.Registry>('org.dxos.app-framework.capability.atom-registry');

export type ReactContext = Readonly<{
  id: string;
  dependsOn?: string[];
  context: FC<PropsWithChildren>;
}>;

/**
 * @category Capability
 */
export const ReactContext = Capability$.make<ReactContext>('org.dxos.app-framework.capability.react-context');

export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;

/**
 * @category Capability
 */
export const ReactRoot = Capability$.make<ReactRoot>('org.dxos.app-framework.capability.react-root');

/**
 * Surface definitions that can be either React components or Web Components.
 */
export type ReactSurface = Surface.Definition | readonly Surface.Definition[];

/**
 * @category Capability
 */
export const ReactSurface = Capability$.make<ReactSurface>('org.dxos.app-framework.common.react-surface');

export type AnyCommand = Command$.Command<any, any, any, any>;

/**
 * @category Capability
 */
export const Command = Capability$.make<AnyCommand>('org.dxos.app-framework.capability.command');

/**
 * @category Capability
 */
export const Layer = Capability$.make<Layer$.Layer<any, any, any>>('org.dxos.app-framework.capability.layer');

/**
 * Layer specification contributed by plugins.
 *
 * Plugins contribute {@link LayerSpec.LayerSpec} entries that are collected by the
 * process-manager module and composed into a {@link LayerStack} which backs the
 * {@link ProcessManagerRuntime}'s service resolver.
 *
 * @category Capability
 */
export const LayerSpec = Capability$.make<LayerSpec$.LayerSpec>('org.dxos.app-framework.capability.layer-spec');

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
export const TraceSink = Capability$.make<TraceSinkFactory>('org.dxos.app-framework.capability.trace-sink');

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
 *     ServiceResolver.provide({ space }, Database.Service, QueueService).pipe(
 *       Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
 *     ),
 *   ),
 * );
 * ```
 *
 * @category Capability
 */
export const ServiceResolver = Capability$.make<ServiceResolver$.ServiceResolver>(
  'org.dxos.app-framework.capability.service-resolver',
);

/**
 * Process monitor backing the shared {@link ProcessManagerRuntime}. Exposes the
 * live process tree (including inactive/terminated entries) via
 * {@link Process$.Monitor#processTreeAtom}.
 *
 * @category Capability
 */
export const ProcessMonitor = Capability$.make<Process$.Monitor>('org.dxos.app-framework.capability.process-monitor');

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
    options?: Runtime$.RunForkOptions,
  ): Fiber$.RuntimeFiber<A, E>;
  runSync<A, E>(effect: Effect.Effect<A, E, ProcessManagerRuntimeServices>): A;
}

/**
 * @category Capability
 */
export const ProcessManagerRuntime = Capability$.make<ProcessManagerRuntime>(
  'org.dxos.app-framework.capability.process-manager-runtime',
);

export type ManagedRuntime = ManagedRuntime$.ManagedRuntime<any, any>;

/**
 * @category Capability
 */
export const ManagedRuntime = Capability$.make<ManagedRuntime>('org.dxos.app-framework.capability.managed-runtime');

//
// Operation System Capabilities
//

export const OperationHandler = Capability$.make<OperationHandlerSet.OperationHandlerSet>(
  'org.dxos.app-framework.capability.operation-handler',
);

export type UndoMapping = UndoMapping$.UndoMapping;

/**
 * Undo mapping registration - contributed by plugins.
 * @category Capability
 */
export const UndoMapping = Capability$.make<UndoMapping[]>('org.dxos.app-framework.capability.undo-mapping');

export type OperationInvoker = OperationInvoker$.OperationInvoker;

/**
 * Operation invoker - provided by OperationPlugin.
 * @category Capability
 */
export const OperationInvoker = Capability$.make<OperationInvoker>(
  'org.dxos.app-framework.capability.operation-invoker',
);

export type UndoRegistry = UndoRegistry$.UndoRegistry;

/**
 * Undo registry - provided by OperationPlugin.
 * @category Capability
 */
export const UndoRegistry = Capability$.make<UndoRegistry>('org.dxos.app-framework.capability.undo-registry');

export type HistoryTracker = HistoryTracker$.HistoryTracker;

/**
 * History tracker - provided by OperationPlugin.
 * @category Capability
 */
export const HistoryTracker = Capability$.make<HistoryTracker>('org.dxos.app-framework.capability.history-tracker');

//
// Atom Capability Helpers
//

/**
 * Get the current value of an atom capability.
 * @example const settings = yield* Capabilities.getAtomValue(ThreadCapabilities.Settings);
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
 * Update an atom capability value (requires writable atom).
 * @example yield* Capabilities.updateAtomValue(ThreadCapabilities.Settings, (s) => ({ ...s, foo: true }));
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
 * @example const unsubscribe = yield* Capabilities.subscribeAtom(ThreadCapabilities.Settings, (value) => ...);
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
