//
// Copyright 2023 DXOS.org
//

import type { PropsWithChildren, ReactNode, RefCallback } from 'react';

import type { MakeOptional, Position } from '@dxos/util';

import type { ErrorBoundary } from '..';

/**
 * Props that are passed to the Surface component.
 */
export type Props<T extends Record<string, any> = Record<string, unknown>> = {
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
} & MakeOptional<CoreProps<T>, 'id' | 'data'> &
  /**
   * Additional props to pass to the component.
   * These props are not used by Surface itself but may be used by components which resolve the surface.
   * Exclude known prop names to prevent overriding well-defined props.
   */
  {
    [K in keyof Record<string, any>]: K extends keyof CoreProps<T> | 'fallback' | 'placeholder' ? never : any;
  };

/**
 * NOTE: If `[key: string]: unknown` is included in shared types, when re-used other fields become unknown as well.
 */
export type CoreProps<T extends Record<string, any> = Record<string, unknown>> = PropsWithChildren<{
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
   * NOTE: This must be a stable value.
   */
  data: T;

  /**
   * If more than one component is resolved, the limit determines how many are rendered.
   */
  limit?: number | undefined;
}>;

export type ComponentProps<T extends Record<string, any> = Record<string, any>> = CoreProps<T> & {
  ref?: RefCallback<HTMLElement>;
} & Record<string, any>;

/**
 * React component used to render a surface once is has matched.
 */
export type ComponentFunction<T extends Record<string, any> = Record<string, any>> = (
  props: ComponentProps<T>,
) => ReactNode;

/**
 * Definition of when a React component surface should be rendered.
 */
export type ReactDefinition<T extends Record<string, any> = any> = Readonly<{
  kind: 'react';
  id: string;
  role: string | string[];
  position?: Position;
  component: ComponentFunction<T>;
  filter?: (data: Record<string, unknown>) => data is T;
}>;

/**
 * Definition of when a Web Component surface should be rendered.
 */
export type WebComponentDefinition<T extends Record<string, any> = any> = Readonly<{
  kind: 'web-component';
  id: string;
  role: string | string[];
  position?: Position;
  /**
   * The tag name of the Web Component to render.
   * The Web Component will receive the same props as React surfaces via properties/attributes.
   */
  tagName: string;
  filter?: (data: Record<string, unknown>) => data is T;
}>;

/**
 * Definition of when a surface (React or Web Component) should be rendered.
 */
export type Definition<T extends Record<string, any> = any> = ReactDefinition<T> | WebComponentDefinition<T>;

/**
 * Creates a React surface definition.
 */
export const create = <T extends Record<string, any> = any>(
  definition: Omit<ReactDefinition<T>, 'kind'>,
): ReactDefinition<T> => ({ ...definition, kind: 'react' });

/**
 * Creates a Web Component surface definition.
 */
export const createWeb = <T extends Record<string, any> = any>(
  definition: Omit<WebComponentDefinition<T>, 'kind'>,
): WebComponentDefinition<T> => ({ ...definition, kind: 'web-component' });
