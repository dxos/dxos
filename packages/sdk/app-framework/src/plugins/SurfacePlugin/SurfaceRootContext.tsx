//
// Copyright 2023 DXOS.org
//

import { createContext, useContext, type JSX, type ForwardedRef } from 'react';

import { raise } from '@dxos/debug';

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

/**
 * Surface debug info.
 * NOTE: Short-term measure to track perf issues.
 */
export type DebugInfo = {
  id: string;
  created: number;
  renderCount: number;
} & Pick<SurfaceProps, 'role' | 'name'>;

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

  /**
   * Debug info.
   */
  debugInfo?: Map<string, DebugInfo>;
};

const SurfaceRootContext = createContext<SurfaceRootContext | undefined>(undefined);

export const useSurfaceRoot = () => useContext(SurfaceRootContext) ?? raise(new Error('Missing SurfaceRootContext'));

export const SurfaceProvider = SurfaceRootContext.Provider;
