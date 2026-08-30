//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useCallback, useRef } from 'react';

import type * as Operation from '@dxos/compute/Operation';

import { Capabilities, type Optimistic } from '../../common';
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

/**
 * Binds a {@link useOptimisticOperation} handler to an {@link Optimistic.Overlay}: `entry` turns
 * the component's callback arguments into the overlay entry rendered until the source catches up.
 */
export type OptimisticBinding<TArgs extends readonly unknown[], TRow> = {
  overlay: Pick<Optimistic.Overlay<TRow>, 'mutate'>;
  entry: (...args: TArgs) => Optimistic.Entry<TRow>;
};

/**
 * Sibling of {@link useOperation} for optimistic gestures: the returned handler registers the optimistic
 * overlay entry synchronously — the gesture's own frame — then dispatches via `invokePromise` and
 * settles the entry from the promise result: success retires it on the next source emission,
 * failure drops it immediately (auto-revert).
 */
export const useOptimisticOperation = <TArgs extends readonly unknown[], TInput, TRow>(
  operation: Operation.Definition<TInput, unknown>,
  map: (...args: TArgs) => TInput,
  optimistic: OptimisticBinding<TArgs, TRow>,
  options?: Operation.InvokeOptions,
): ((...args: TArgs) => void) => {
  const { invokePromise } = useOperationInvoker();
  const mapRef = useRef(map);
  mapRef.current = map;
  const optimisticRef = useRef(optimistic);
  optimisticRef.current = optimistic;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  return useCallback(
    (...args: TArgs) => {
      const { overlay, entry } = optimisticRef.current;
      const handle = overlay.mutate(entry(...args));
      void invokePromise(operation, mapRef.current(...args), optionsRef.current).then(
        ({ error }) => (error ? handle.revert() : handle.commit()),
        () => handle.revert(),
      );
    },
    [invokePromise, operation],
  );
};
