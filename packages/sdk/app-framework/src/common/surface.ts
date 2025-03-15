//
// Copyright 2023 DXOS.org
//

import { type JSX, type ForwardedRef, type PropsWithChildren, type ReactNode } from 'react';

import { type GuardedType, type MakeOptional, type Position } from '@dxos/util';

import { type ErrorBoundary } from '../react';

/**
 * SurfaceProps are the props that are passed to the Surface component.
 */
export type SurfaceProps<T extends Record<string, any> = Record<string, unknown>> = PropsWithChildren<{
  /**
   * If specified, the Surface will be wrapped in an error boundary.
   * The fallback component will be rendered if an error occurs.
   */
  fallback?: ErrorBoundary['props']['fallback'];

  /**
   * If specified, the Surface will be wrapped in a suspense boundary.
   * The placeholder component will be rendered while the surface component is loading.
   */
  placeholder?: ReactNode;
}> &
  MakeOptional<CoreSurfaceProps<T>, 'id' | 'data'> & {
    /**
     * Additional props to pass to the component.
     * These props are not used by Surface itself but may be used by components which resolve the surface.
     */
    [key: string]: unknown;
  };

// NOTE: If `[key: string]: unknown` is included in shared types, when re-used other fields become unknown as well.
type CoreSurfaceProps<T extends Record<string, any> = Record<string, unknown>> = {
  /**
   * ID for debugging.
   */
  id: string;

  /**
   * Role defines how the data should be rendered.
   */
  role: string;

  /**
   * The data to be rendered by the surface.
   */
  data: T;

  /**
   * If more than one component is resolved, the limit determines how many are rendered.
   */
  limit?: number | undefined;
};

type SurfaceComponentProps<T extends Record<string, any> = Record<string, unknown>> = PropsWithChildren<
  CoreSurfaceProps<T> & { [key: string]: unknown }
>;

/**
 * React component used to render a surface once is has matched.
 */
export type SurfaceComponent<T extends Record<string, any> = Record<string, unknown>> = (
  props: SurfaceComponentProps<T>,
  forwardedRef: ForwardedRef<HTMLElement>,
) => JSX.Element | null;

/**
 * Definition of when a SurfaceComponent should be rendered.
 */
export type SurfaceDefinition<T extends Record<string, any> = any> = Readonly<{
  id: string;
  role: string | string[];
  position?: Position;
  filter?: (data: Record<string, unknown>) => data is T;
  component: SurfaceComponent<GuardedType<SurfaceDefinition<T>['filter']>>;
}>;

export const createSurface = <T extends Record<string, any> = any>(definition: SurfaceDefinition<T>) => definition;
