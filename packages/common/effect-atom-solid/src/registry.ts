//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { type Context, createContext, onCleanup, useContext } from 'solid-js';

import { GlobalValue } from '@dxos/effect';

/**
 * Default registry instance
 */
export const defaultRegistry: AtomRegistry.AtomRegistry = GlobalValue.globalValue(
  '@dxos/effect-atom-solid/defaultRegistry',
  () => AtomRegistry.make(),
);

/**
 * Solid context for the atom registry
 */
export const RegistryContext: Context<AtomRegistry.AtomRegistry> =
  createContext<AtomRegistry.AtomRegistry>(defaultRegistry);

/**
 * Get the current registry from context
 */
export const useRegistry = (): AtomRegistry.AtomRegistry => {
  return useContext(RegistryContext);
};

/**
 * Provider component for custom registry
 */
export interface RegistryProviderProps {
  children: any;
  registry?: AtomRegistry.AtomRegistry;
  initialValues?: Iterable<readonly [Atom.Atom<any>, any]>;
  scheduleTask?: (f: () => void) => () => void;
  timeoutResolution?: number;
  defaultIdleTTL?: number;
}

export function RegistryProvider(props: RegistryProviderProps) {
  const registry =
    props.registry ??
    AtomRegistry.make({
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
