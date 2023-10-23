//
// Copyright 2023 DXOS.org
//

import { type ReactNode, createContext, useContext, type Context, type Provider } from 'react';

import { type Falsy } from '@dxos/util';

/**
 * Function which resolves a Surface.
 *
 * If a falsy value is returned, the rendering is deferred to other plugins.
 */
export type SurfaceComponent = (data: Record<string, unknown>, role?: string) => ReactNode | Falsy;

export type SurfaceRootContext = {
  components: Record<string, SurfaceComponent>;
};

const SurfaceRootContext: Context<SurfaceRootContext> = createContext<SurfaceRootContext>({ components: {} });

export const useSurface = () => useContext(SurfaceRootContext);

export const SurfaceProvider: Provider<SurfaceRootContext> = SurfaceRootContext.Provider;
