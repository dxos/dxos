//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import { useContext } from 'react';

import { HaloContext, type HaloServices } from './context';

/**
 * Returns the HALO services context. Throws if no {@link HaloProvider} is above in the tree.
 * Individual hooks read their service off it via `Context.get(services, <Tag>)`.
 */
export const useHaloServices = (): Context.Context<HaloServices> => {
  const services = useContext(HaloContext);
  if (!services) {
    throw new Error('Missing HaloContext. Wrap the tree in <HaloProvider>.');
  }
  return services;
};
