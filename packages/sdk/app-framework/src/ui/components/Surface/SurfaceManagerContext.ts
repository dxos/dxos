//
// Copyright 2026 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type SurfaceManager } from './SurfaceManager';

const SurfaceManagerContext: Context<SurfaceManager | undefined> = createContext<SurfaceManager | undefined>(undefined);

/**
 * Get the surface manager. Throws when rendered outside a {@link SurfaceManagerProvider};
 * surfaces already hard-require the plugin-manager context, so there is no optional variant.
 */
export const useSurfaceManager = (): SurfaceManager =>
  useContext(SurfaceManagerContext) ?? raise(new Error('Missing SurfaceManagerContext'));

/**
 * Context provider for a surface manager.
 */
export const SurfaceManagerProvider = SurfaceManagerContext.Provider;
