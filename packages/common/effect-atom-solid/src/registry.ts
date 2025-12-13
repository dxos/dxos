//
// Copyright 2025 DXOS.org
//

import type * as Atom from '@effect-atom/atom/Atom';
import * as Registry from '@effect-atom/atom/Registry';
import * as GlobalValue from 'effect/GlobalValue';
import { type Context, createContext, onCleanup, useContext } from 'solid-js';

/**
 * Default registry instance
 */
export const defaultRegistry: Registry.Registry = GlobalValue.globalValue(
  '@effect-atom/atom-solid/defaultRegistry',
  () => Registry.make(),
);

/**
 * Solid context for the atom registry
 */
export const RegistryContext: Context<Registry.Registry> = createContext<Registry.Registry>(defaultRegistry);

/**
 * Get the current registry from context
 */
export const useRegistry = (): Registry.Registry => {
  return useContext(RegistryContext);
};

/**
 * Provider component for custom registry
 */
export interface RegistryProviderProps {
  children: any;
  registry?: Registry.Registry;
  initialValues?: Iterable<readonly [Atom.Atom<any>, any]>;
  scheduleTask?: (f: () => void) => void;
  timeoutResolution?: number;
  defaultIdleTTL?: number;
}

export function RegistryProvider(props: RegistryProviderProps) {
  const registry =
    props.registry ??
    Registry.make({
      scheduleTask: props.scheduleTask,
      initialValues: props.initialValues,
      timeoutResolution: props.timeoutResolution,
      defaultIdleTTL: props.defaultIdleTTL ?? 400,
    });

  onCleanup(() => {
    // Delay disposal to allow for component re-mounting
    const timeout = setTimeout(() => {
      registry.dispose();
    }, 500);
    return () => clearTimeout(timeout);
  });

  return RegistryContext.Provider({
    value: registry,
    get children() {
      return props.children;
    },
  });
}
