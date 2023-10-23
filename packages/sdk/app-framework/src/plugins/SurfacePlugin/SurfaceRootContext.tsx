//
// Copyright 2023 DXOS.org
//

import { type ReactNode, createContext, useContext, type Context, type Provider } from 'react';

/**
 *
 */
export type SurfaceComponent = (data: Record<string, unknown>, role?: string) => ReactNode | undefined;

export type SurfaceRootContext = {
  components: Record<string, SurfaceComponent>;
};

const SurfaceRootContext: Context<SurfaceRootContext> = createContext<SurfaceRootContext>({ components: {} });

export const useSurface = () => useContext(SurfaceRootContext);

export const SurfaceProvider: Provider<SurfaceRootContext> = SurfaceRootContext.Provider;
