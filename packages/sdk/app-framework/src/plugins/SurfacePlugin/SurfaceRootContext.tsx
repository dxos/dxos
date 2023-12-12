//
// Copyright 2023 DXOS.org
//

import { createContext, useContext, type Context, type Provider, type ForwardedRef } from 'react';

import { type SurfaceProps } from './Surface';

// TODO(wittjosiah): Factor out.
type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

type SurfaceComponentProps = WithRequiredProperty<SurfaceProps, 'data'>;

/**
 * Determines the priority of the surface when multiple components are resolved.
 */
export type SurfaceDisposition = 'hoist' | 'fallback';

export type SurfaceResult = {
  node: JSX.Element;
  disposition?: SurfaceDisposition;
};

/**
 * Function which resolves a Surface.
 *
 * If a null value is returned, the rendering is deferred to other plugins.
 */
export type SurfaceComponent = (
  props: SurfaceComponentProps,
  forwardedRef: ForwardedRef<HTMLElement>,
) => JSX.Element | SurfaceResult | null;

export type SurfaceRootContext = {
  components: Record<string, SurfaceComponent>;
};

const SurfaceRootContext: Context<SurfaceRootContext> = createContext<SurfaceRootContext>({ components: {} });

export const useSurface = () => useContext(SurfaceRootContext);

export const SurfaceProvider: Provider<SurfaceRootContext> = SurfaceRootContext.Provider;
