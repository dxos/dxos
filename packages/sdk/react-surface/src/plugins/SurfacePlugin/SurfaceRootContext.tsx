//
// Copyright 2023 DXOS.org
//

import { type ReactNode, type Ref, createContext, useContext } from 'react';

import { type SurfaceDatum } from './Surface';

/**
 *
 */
export type SurfaceComponent = (data: SurfaceDatum, forwardedRef: Ref<HTMLElement>) => ReactNode | null;

export type SurfaceRootContext = {
  components: Record<string, SurfaceComponent>;
};

const SurfaceRootContext = createContext<SurfaceRootContext>({ components: {} });

export const useSurface = () => useContext(SurfaceRootContext);

export const SurfaceProvider = SurfaceRootContext.Provider;
