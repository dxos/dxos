//
// Copyright 2023 DXOS.org
//

import { createContext, useContext, type Context, type Provider, type ReactNode } from 'react';

/**
 * Function which resolves a Surface.
 *
 * If a null value is returned, the rendering is deferred to other plugins.
 */
export type SurfaceComponent = (data: Record<string, unknown>, role?: string) => ReactNode;

export type SurfaceRootContext = {
  components: Record<string, SurfaceComponent>;
};

const SurfaceRootContext: Context<SurfaceRootContext> = createContext<SurfaceRootContext>({ components: {} });

export const useSurface = () => useContext(SurfaceRootContext);

export const SurfaceProvider: Provider<SurfaceRootContext> = SurfaceRootContext.Provider;
