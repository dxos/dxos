//
// Copyright 2023 DXOS.org
//

import type { ComponentType, PropsWithChildren, ReactNode } from 'react';

import { type MakeOptional, type Position } from '@dxos/util';

import { type ErrorBoundary } from '../react';

/**
 * SurfaceProps are the props that are passed to the Surface component.
 */
export type SurfaceProps<T extends Record<string, any> = Record<string, unknown>> = {
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
} & MakeOptional<CoreSurfaceProps<T>, 'id' | 'data'> &
  /**
   * Additional props to pass to the component.
   * These props are not used by Surface itself but may be used by components which resolve the surface.
   * Exclude known prop names to prevent overriding well-defined props.
   */
  {
    [K in keyof Record<string, any>]: K extends keyof CoreSurfaceProps<T> | 'fallback' | 'placeholder' ? never : any;
  };

/**
 * NOTE: If `[key: string]: unknown` is included in shared types, when re-used other fields become unknown as well.
 */
export type CoreSurfaceProps<
  T extends Record<string, any> = Record<string, unknown>,
  R extends string = string,
> = PropsWithChildren<{
  /**
   * ID for debugging.
   */
  id: string;

  /**
   * Role defines how the data should be rendered.
   * See: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles
   */
  role: R;

  /**
   * The data to be rendered by the surface.
   * NOTE: This must be a stable value.
   */
  data: T;

  /**
   * If more than one component is resolved, the limit determines how many are rendered.
   */
  limit?: number | undefined;
}>;

export type SurfaceComponentProps<
  T extends Record<string, any> = Record<string, any>,
  R extends string = string,
> = CoreSurfaceProps<T, R> & Record<string, any>;

/**
 * React component used to render a surface once is has matched.
 */
export type SurfaceComponent<
  T extends Record<string, any> = Record<string, any>,
  R extends string = string,
> = ComponentType<SurfaceComponentProps<T, R>>;

/**
 * Definition of when a SurfaceComponent should be rendered.
 */
export type SurfaceDefinition<T extends Record<string, any> = any, R extends string = string> = Readonly<{
  id: string;
  role: R | R[];
  position?: Position;
  component: SurfaceComponent<T, R>;
  filter?: (data: Record<string, unknown>) => data is T;
}>;

/**
 * Creates a surface definition.
 * The role type is widened to `string` to ensure compatibility with ReactSurface capability type.
 */
// TODO(burdon): Can we narrow R?
export const createSurface = <T extends Record<string, any> = any, R extends string = string>(
  definition: SurfaceDefinition<T, R>,
): SurfaceDefinition<T, string> => definition as unknown as SurfaceDefinition<T, string>;
