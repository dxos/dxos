//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { use, useCallback, useLayoutEffect, useRef } from 'react';

import { NoHandlerError } from '@dxos/compute/errors';
import type * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { Capabilities } from '../../common';
import { type Capability } from '../../core';
import { usePluginManager } from '../components';

/** Stable atom yielding `undefined`, used as the fallback for optional atom-capability lookups. */
const emptyAtomValue = Atom.make(() => undefined);

/**
 * Hook to request capabilities from the plugin context.
 * @returns An array of capabilities.
 */
export const useCapabilities = <T>(interfaceDef: Capability.InterfaceDef<T>) => {
  const manager = usePluginManager();
  return useAtomValue(manager.capabilities.atom(interfaceDef));
};

/**
 * Hook to request a capability from the plugin context.
 *
 * Suspends (throws the contribution promise) while nothing has contributed the interface yet, so a
 * reader that renders before its provider activates parks at its nearest Suspense boundary. An
 * invariant here cannot tell "not yet" from "never": most providers are idle-gated or wait on a
 * runtime event, so the reader legitimately renders first, and hard-failing on that blanks the
 * subtree. Declaring the dependency as the module's `requires` is NOT the alternative — that
 * demotes the reader's module into the provider's (later) wave.
 *
 * @returns The capability.
 */
export const useCapability = <T>(interfaceDef: Capability.InterfaceDef<T>) => {
  const manager = usePluginManager();
  const capabilities = useCapabilities(interfaceDef);
  if (capabilities.length === 0) {
    throw manager.capabilities.waitForPromise(interfaceDef);
  }
  return capabilities[0];
};

/**
 * Hook to request capabilities that a plugin may or may not contribute.
 * @returns An array of capabilities, empty when none is registered.
 */
export const useOptionalCapabilities = <T>(interfaceDef: Capability.InterfaceDef<T>): readonly T[] => {
  const manager = usePluginManager();
  return useAtomValue(manager.capabilities.atom(interfaceDef));
};

/**
 * Hook to request a single capability that a plugin may or may not contribute.
 * @returns The first matching capability, or `undefined` when none is registered.
 */
export const useOptionalCapability = <T>(interfaceDef: Capability.InterfaceDef<T>): T | undefined =>
  useOptionalCapabilities(interfaceDef)[0];

/**
 * Hook to get the current value of an atom capability.
 * Automatically subscribes to changes.
 * @example const settings = useAtomCapability(CommentCapabilities.Settings);
 */
export const useAtomCapability = <T>(atomCapability: Capability.InterfaceDef<Atom.Atom<T>>): T => {
  const atom = useCapability(atomCapability);
  return useAtomValue(atom);
};

/**
 * Tolerant variant of {@link useAtomCapability}: returns `undefined` while the atom capability is
 * not registered, rather than throwing. Use it wherever a reader can render before its provider —
 * a provider gated on a genuine runtime event (a status indicator whose state arrives with the
 * client) cannot be pulled onto the startup pass with `requires`.
 */
export const useOptionalAtomCapability = <T>(atomCapability: Capability.InterfaceDef<Atom.Atom<T>>): T | undefined => {
  const atom = useOptionalCapability(atomCapability);
  return useAtomValue(atom ?? emptyAtomValue) as T | undefined;
};

/**
 * Hook to get value and updater for an atom capability.
 * Returns [currentValue, updateFn] similar to useState.
 * @example const [settings, updateSettings] = useAtomCapabilityState(CommentCapabilities.Settings);
 */
export const useAtomCapabilityState = <T>(
  atomCapability: Capability.InterfaceDef<Atom.Writable<T>>,
): [T, (fn: (current: T) => T) => void] => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const atom = useCapability(atomCapability);
  const value = useAtomValue(atom);
  const update = useCallback(
    (fn: (current: T) => T) => {
      registry.set(atom, fn(registry.get(atom)));
    },
    [registry, atom],
  );
  return [value, update];
};

/**
 * Tolerant variant of {@link useAtomCapabilityState}: returns `[undefined, noop]` when the atom
 * capability is not registered (e.g. the contributing plugin is not installed) rather than
 * throwing. The updater is a no-op while the capability is absent.
 */
export const useOptionalAtomCapabilityState = <T>(
  atomCapability: Capability.InterfaceDef<Atom.Writable<T>>,
): [T | undefined, (fn: (current: T) => T) => void] => {
  const registry = useOptionalCapability(Capabilities.AtomRegistry);
  const atom = useOptionalCapability(atomCapability);
  const value = useAtomValue(atom ?? emptyAtomValue);
  const update = useCallback(
    (fn: (current: T) => T) => {
      if (registry && atom) {
        registry.set(atom, fn(registry.get(atom)));
      }
    },
    [registry, atom],
  );
  return [value, update];
};

/**
 * Hook to get the operation invoker capability.
 */
export const useOperationInvoker = (): Capabilities.OperationInvoker => useCapability(Capabilities.OperationInvoker);

/**
 * Suspensefully resolves an operation's handler as an effect fn: `(input) => Effect<Output>`.
 * With `map`, binds the component's callback arguments to the operation input instead:
 * `(...args) => Effect<Output>`.
 *
 * Resolves against the merged {@link Capabilities.OperationHandlers} set. Handler sets are all
 * registered by startup (only handler BODIES load lazily), so the component suspends only while
 * the matched handler's module loads — `getHandlerFor` returns a per-key stable promise, which is
 * what lets `use` resume instead of re-suspending on every retry render. Throws
 * {@link NoHandlerError} when no contributed set knows the operation.
 *
 * The returned effect still requires the operation's declared services; run it via
 * {@link useSpaceCallback} or the {@link Capabilities.ProcessManagerRuntime}.
 *
 * @example const moveTask = useOperationHandler(TaskOperation.MoveTask);
 * @example const move = useOperationHandler(TaskOperation.MoveTask, (task: Task) => ({ task: Ref.make(task) }));
 */
export const useOperationHandler: {
  <const Def extends Operation.Definition.Any>(operation: Def): Operation.Definition.HandlerType<Def>;
  <const Def extends Operation.Definition.Any, TArgs extends readonly unknown[]>(
    operation: Def,
    map: (...args: TArgs) => Operation.Definition.Input<Def>,
  ): (...args: TArgs) => Effect.Effect<Operation.Definition.Output<Def>, any, Operation.Definition.Services<Def>>;
} = <const Def extends Operation.Definition.Any, TArgs extends readonly unknown[]>(
  operation: Def,
  map?: (...args: TArgs) => Operation.Definition.Input<Def>,
): any => {
  const handlers = useCapability(Capabilities.OperationHandlers);
  const withHandler = use(OperationHandlerSet.findHandler(handlers, operation));
  if (!withHandler) {
    throw new NoHandlerError(operation.meta.key);
  }
  const handler = withHandler.handler;
  // The mapper reads through a ref so the mapped form keeps a stable identity across renders,
  // like {@link useOperation}. Updated in a layout effect so a discarded concurrent render's
  // mapper (closing over that render's props) never leaks into the committed callback.
  const mapRef = useRef(map);
  useLayoutEffect(() => {
    mapRef.current = map;
  }, [map]);
  const mapped = useCallback((...args: TArgs) => handler(mapRef.current!(...args)), [handler]);
  return map ? mapped : handler;
};

/**
 * Binds an operation to a UI callback in one step: `map` turns the component's callback
 * arguments into the operation's input. The handler identity is stable across renders (the
 * mapper and options read through refs), so it replaces per-handler `useCallback` boilerplate.
 */
export const useOperation = <TArgs extends readonly unknown[], TInput>(
  operation: Operation.Definition<TInput, unknown>,
  map: (...args: TArgs) => TInput,
  options?: Operation.InvokeOptions,
): ((...args: TArgs) => void) => {
  const { invokePromise } = useOperationInvoker();
  const mapRef = useRef(map);
  mapRef.current = map;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  return useCallback(
    (...args: TArgs) => void invokePromise(operation, mapRef.current(...args), optionsRef.current),
    [invokePromise, operation],
  );
};
