//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import React, { type PropsWithChildren, type Context as ReactContext, createContext, useContext, useMemo } from 'react';

import { type Identity, type Space } from '@dxos/halo';

/**
 * The HALO services, as the tag union carried in an Effect service {@link Context.Context}.
 */
export type HaloServices = Identity.Service | Space.Service;

/**
 * The HALO {@link Atom} runtime from the nearest {@link HaloProvider}. Hooks build their atoms
 * from it (`runtime.atom(stream)`); it is not part of the public surface.
 */
const HaloRuntimeContext: ReactContext<Atom.AtomRuntime<HaloServices> | undefined> = createContext<
  Atom.AtomRuntime<HaloServices> | undefined
>(undefined);

export type HaloProviderProps = PropsWithChildren<{
  /**
   * The HALO services context. Build it from a concrete backing — e.g. the client adapter's
   * `makeIdentityService` / `makeSpaceService` from `@dxos/halo-adapter-client` — and pass it
   * here. It is wrapped in an {@link Atom} runtime so the hooks resolve against it.
   */
  services: Context.Context<HaloServices>;
}>;

/**
 * Provides the HALO services to the hook library. Wrap the application (or the subtree that uses
 * the hooks) in this provider. Replaces `ClientProvider` for HALO concerns.
 */
export const HaloProvider = ({ services, children }: HaloProviderProps) => {
  const runtime = useMemo(() => Atom.runtime(Layer.succeedContext(services)), [services]);
  return <HaloRuntimeContext.Provider value={runtime}>{children}</HaloRuntimeContext.Provider>;
};

/**
 * Returns the HALO atom runtime. Throws if no {@link HaloProvider} is above in the tree.
 */
export const useHaloRuntime = (): Atom.AtomRuntime<HaloServices> => {
  const runtime = useContext(HaloRuntimeContext);
  if (!runtime) {
    throw new Error('Missing HaloProvider.');
  }
  return runtime;
};
