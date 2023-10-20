//
// Copyright 2022 DXOS.org
//

import React, { type Ref, forwardRef, type ReactNode } from 'react';
import { createContext, useContext } from 'react';

import { ErrorBoundary } from './ErrorBoundary';
import { type SurfaceComponent, useSurface } from './SurfaceRootContext';

/**
 *
 */
export type SurfaceDatum = {
  /**
   * If specified, the Surface will lookup the component(s) by name and only render if found.
   */
  $component?: string | string[];

  /**
   * Automatically set based on the role of the surface.
   */
  $role?: string;

  /**
   * Configure nested surfaces.
   */
  $surfaces?: Record<string, Partial<SurfaceProps>>;

  /**
   * Any other data to be passed to the component.
   */
  [key: string]: unknown;
};

/**
 * Direction determines how multiple components are laid out.
 */
export type Direction = 'inline' | 'inline-reverse' | 'block' | 'block-reverse';

export type SurfaceProps = {
  /**
   * Role defines how the data should be rendered.
   */
  role?: string;

  /**
   * Names allow nested surfaces to be specified in the parent context, similar to a slot.
   *
   * Defaults to the value of `role` if not specified.
   */
  name?: string;

  /**
   * The data to be rendered by the surface.
   */
  data?: SurfaceDatum;

  /**
   * If specified, the Surface will be wrapped in an error boundary.
   * The fallback component will be rendered if an error occurs.
   */
  fallback?: ErrorBoundary['props']['fallback'];

  /**
   * If more than one component is resolved, the limit determines how many are rendered.
   */
  limit?: number | undefined;

  /**
   * If more than one component is resolved, the direction determines how they are laid out.
   *
   * NOTE: This is not yet implemented.
   */
  direction?: Direction;
};

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
export const Surface = forwardRef<HTMLElement, SurfaceProps>(({ role, name = role, ...rest }, forwardedRef) => {
  const props = { role, name, ...rest };
  const context = useContext(SurfaceContext);
  const data = props.data ?? (props.name && context?.data?.$surfaces?.[props.name]?.data);
  const fallback = props.fallback ?? (props.name && context?.data?.$surfaces?.[props.name]?.fallback);

  return (
    <>
      {fallback ? (
        <ErrorBoundary data={data} fallback={fallback}>
          <SurfaceResolver {...props} />
        </ErrorBoundary>
      ) : (
        <SurfaceResolver {...props} ref={forwardedRef} />
      )}
    </>
  );
});

type SurfaceContext = SurfaceProps & {
  //
  parent?: SurfaceContext;

  //
  root?: SurfaceContext;
};

//
//
const SurfaceContext = createContext<SurfaceContext | null>(null);

//
//
const SurfaceResolver = forwardRef<HTMLElement, SurfaceProps>((props, forwardedRef) => {
  const { components } = useSurface();
  const parent = useContext(SurfaceContext);
  const nodes = resolveNodes(components, props, parent, forwardedRef);
  const currentContext = {
    ...((props.name && parent?.data?.$surfaces?.[props.name]) ?? {}),
    ...props,
    ...(parent ? { parent, root: parent.root ?? parent } : {}),
  };

  return <SurfaceContext.Provider value={currentContext}>{nodes}</SurfaceContext.Provider>;
});

//
//
const resolveNodes = (
  components: Record<string, SurfaceComponent>,
  props: SurfaceProps,
  context: SurfaceContext | null,
  forwardedRef: Ref<HTMLElement>,
): ReactNode[] => {
  const data = {
    $role: props.role ?? (props.name && context?.data?.$surfaces?.[props.name]?.role),
    ...(props.name && context?.data?.$surfaces?.[props.name]?.data),
    ...props.data,
  };

  const nodes = Object.values(components)
    .map((component) => component(data, forwardedRef))
    .filter((Component): Component is ReactNode => Boolean(Component));

  return props.limit ? nodes.slice(0, props.limit) : nodes;
};
