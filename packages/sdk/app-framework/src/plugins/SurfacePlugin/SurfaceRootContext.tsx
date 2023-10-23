//
// Copyright 2023 DXOS.org
//

import { type ReactNode, type Ref, createContext, useContext, type Context, type Provider } from 'react';

import { type SurfaceDatum } from './Surface';

/**
 *
 */
export type SurfaceComponent = (data: SurfaceDatum, forwardedRef?: Ref<HTMLElement>) => ReactNode | undefined;

export type SurfaceRootContext = {
  components: Record<string, SurfaceComponent>;
};

const SurfaceRootContext: Context<SurfaceRootContext> = createContext<SurfaceRootContext>({ components: {} });

export const useSurface = () => useContext(SurfaceRootContext);

export const SurfaceProvider: Provider<SurfaceRootContext> = SurfaceRootContext.Provider;
