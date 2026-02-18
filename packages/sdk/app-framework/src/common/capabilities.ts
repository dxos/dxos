//
// Copyright 2025 DXOS.org
//

import type * as Command$ from '@effect/cli/Command';
import { type Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import type * as Layer$ from 'effect/Layer';
import type * as ManagedRuntime$ from 'effect/ManagedRuntime';
import type { FC, PropsWithChildren } from 'react';

import type { OperationInvoker as OperationInvoker$, OperationResolver as OperationResolver$ } from '@dxos/operation';

import { Capability as Capability$, type PluginManager as PluginManager$ } from '../core';
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
export const Null = Capability$.make<null>('dxos.org/app-framework/capability/null');

/**
 * @category Capability
 */
export const PluginManager = Capability$.make<PluginManager$.PluginManager>(
  'dxos.org/app-framework/capability/plugin-manager',
);

/**
 * @category Capability
 */
export const AtomRegistry = Capability$.make<Registry.Registry>('dxos.org/app-framework/capability/atom-registry');

export type ReactContext = Readonly<{
  id: string;
  dependsOn?: string[];
  context: FC<PropsWithChildren>;
}>;

/**
 * @category Capability
 */
export const ReactContext = Capability$.make<ReactContext>('dxos.org/app-framework/capability/react-context');

export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;

/**
 * @category Capability
 */
export const ReactRoot = Capability$.make<ReactRoot>('dxos.org/app-framework/capability/react-root');

/**
 * Surface definitions that can be either React components or Web Components.
 */
export type ReactSurface = Surface.Definition | readonly Surface.Definition[];

/**
 * @category Capability
 */
export const ReactSurface = Capability$.make<ReactSurface>('dxos.org/app-framework/common/react-surface');

export type AnyCommand = Command$.Command<any, any, any, any>;

/**
 * @category Capability
 */
export const Command = Capability$.make<AnyCommand>('dxos.org/app-framework/capability/command');

/**
 * @category Capability
 */
export const Layer = Capability$.make<Layer$.Layer<any, any, any>>('dxos.org/app-framework/capability/layer');

export type ManagedRuntime = ManagedRuntime$.ManagedRuntime<any, any>;

/**
 * @category Capability
 */
export const ManagedRuntime = Capability$.make<ManagedRuntime>('dxos.org/app-framework/capability/managed-runtime');

//
// Operation System Capabilities
//

export type OperationResolver = OperationResolver$.OperationResolver<any, any, any, any>;

/**
 * Handler registration for operations - contributed by plugins.
 * @category Capability
 */
export const OperationResolver = Capability$.make<OperationResolver[]>(
  'dxos.org/app-framework/capability/operation-resolver',
);

export type UndoMapping = UndoMapping$.UndoMapping;

/**
 * Undo mapping registration - contributed by plugins.
 * @category Capability
 */
export const UndoMapping = Capability$.make<UndoMapping[]>('dxos.org/app-framework/capability/undo-mapping');

export type OperationInvoker = OperationInvoker$.OperationInvoker;

/**
 * Operation invoker - provided by OperationPlugin.
 * @category Capability
 */
export const OperationInvoker = Capability$.make<OperationInvoker>(
  'dxos.org/app-framework/capability/operation-invoker',
);

export type UndoRegistry = UndoRegistry$.UndoRegistry;

/**
 * Undo registry - provided by OperationPlugin.
 * @category Capability
 */
export const UndoRegistry = Capability$.make<UndoRegistry>('dxos.org/app-framework/capability/undo-registry');

export type HistoryTracker = HistoryTracker$.HistoryTracker;

/**
 * History tracker - provided by OperationPlugin.
 * @category Capability
 */
export const HistoryTracker = Capability$.make<HistoryTracker>('dxos.org/app-framework/capability/history-tracker');

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
