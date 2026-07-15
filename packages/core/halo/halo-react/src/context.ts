//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import { type Context as ReactContext, createContext } from 'react';

import { type Identity, type Space } from '@dxos/halo';

/**
 * The HALO services, as the tag union carried in an Effect service {@link Context.Context}.
 */
export type HaloServices = Identity.Service | Space.Service;

/**
 * React context carrying the Effect {@link Context.Context} of HALO services. Hooks read a
 * service off this context and bridge its snapshot + change stream into React state. Set it with
 * {@link HaloProvider}.
 */
export const HaloContext: ReactContext<Context.Context<HaloServices> | undefined> = createContext<
  Context.Context<HaloServices> | undefined
>(undefined);
