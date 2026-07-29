//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import React, { type PropsWithChildren, createContext, useContext } from 'react';

import { type Identity, type Space } from '@dxos/halo';

/**
 * The HALO services, as the tag union carried in an Effect service {@link Context.Context}.
 */
export type HaloServices = Identity.Service | Space.Service;

/**
 * React context carrying the HALO services. Hooks read it, provide it into a service stream, and
 * surface the result through the default {@link Atom} runtime.
 */
const HaloServicesContext = createContext<Context.Context<HaloServices> | undefined>(undefined);

export type HaloProviderProps = PropsWithChildren<{
  /**
   * The HALO services context. Build it from a concrete backing — e.g. the client adapter's
   * `makeIdentityService` / `makeSpaceService` from `@dxos/halo-adapter-client` — and pass it
   * here.
   */
  services: Context.Context<HaloServices>;
}>;

/**
 * Provides the HALO services to the hook library. Wrap the application (or the subtree that uses
 * the hooks) in this provider. Replaces `ClientProvider` for HALO concerns.
 */
export const HaloProvider = ({ services, children }: HaloProviderProps) => (
  <HaloServicesContext.Provider value={services}>{children}</HaloServicesContext.Provider>
);

/**
 * Returns the HALO services context. Throws if no {@link HaloProvider} is above in the tree.
 */
export const useHaloServices = (): Context.Context<HaloServices> => {
  const services = useContext(HaloServicesContext);
  if (!services) {
    throw new Error('Missing HaloProvider.');
  }
  return services;
};
