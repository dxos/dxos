//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import React, { type PropsWithChildren } from 'react';

import { HaloContext, type HaloServices } from './context';

export type HaloProviderProps = PropsWithChildren<{
  /**
   * The HALO services context. Build it from a concrete backing — e.g. the client adapter's
   * `makeIdentityService` / `makeSpaceService` / `makeInvitationService` from
   * `@dxos/halo-adapter-client` — and pass it here.
   */
  services: Context.Context<HaloServices>;
}>;

/**
 * Provides the HALO services to the hook library. Wrap the application (or the subtree that uses
 * the hooks) in this provider. Replaces `ClientProvider` for HALO concerns.
 */
export const HaloProvider = ({ services, children }: HaloProviderProps) => (
  <HaloContext.Provider value={services}>{children}</HaloContext.Provider>
);
