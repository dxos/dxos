//
// Copyright 2022 DXOS.org
//

import React, {
  forwardRef,
  type ReactNode,
  Fragment,
  type ForwardedRef,
  type PropsWithChildren,
  isValidElement,
  Suspense,
} from 'react';
import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { ErrorBoundary } from './ErrorBoundary';
import { type SurfaceComponent, type SurfaceResult, useSurfaceRoot } from './SurfaceRootContext';

/**
 * Direction determines how multiple components are laid out.
 */
export type Direction = 'inline' | 'inline-reverse' | 'block' | 'block-reverse';

/**
 * SurfaceProps are the props that are passed to the Surface component.
 */
export type SurfaceProps = PropsWithChildren<{
  /**
   * Role defines how the data should be rendered.
   */
  role?: string;

  /**
   * Names allow nested surfaces to be specified in the parent context, similar to a slot.
   * Defaults to the value of `role` if not specified.
   */
  name?: string;

  /**
   * The data to be rendered by the surface.
   */
  data?: Record<string, unknown>;

  /**
   * Configure nested surfaces (indexed by the surface's `name`).
   */
  surfaces?: Record<string, Pick<SurfaceProps, 'data' | 'surfaces'>>;

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

  /**
   * If more than one component is resolved, the limit determines how many are rendered.
   */
  limit?: number | undefined;

  /**
   * If more than one component is resolved, the direction determines how they are laid out.
   * NOTE: This is not yet implemented.
   */
  direction?: Direction;

  /**
   * Additional props to pass to the component.
   * These props are not used by Surface itself but may be used by components which resolve the surface.
   */
  [key: string]: unknown;
}>;

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
export const Surface = forwardRef<HTMLElement, SurfaceProps>(
  ({ role, name = role, fallback, placeholder, ...rest }, forwardedRef) => {
    const props = { role, name, fallback, ...rest };
    const context = useContext(SurfaceContext);
    const data = props.data ?? ((name && context?.surfaces?.[name]?.data) || {});

    const resolver = <SurfaceResolver {...props} ref={forwardedRef} />;
    const suspense = placeholder ? <Suspense fallback={placeholder}>{resolver}</Suspense> : resolver;

    return fallback ? (
      <ErrorBoundary data={data} fallback={fallback}>
        {suspense}
      </ErrorBoundary>
    ) : (
      suspense
    );
  },
);

const SurfaceContext = createContext<SurfaceProps | null>(null);

export const useSurface = (): SurfaceProps =>
  useContext(SurfaceContext) ?? raise(new Error('Surface context not found'));

const SurfaceResolver = forwardRef<HTMLElement, SurfaceProps>((props, forwardedRef) => {
  const { components } = useSurfaceRoot();
  const parent = useContext(SurfaceContext);
  const nodes = resolveNodes(components, props, parent, forwardedRef);
  const currentContext: SurfaceProps = {
    ...props,
    surfaces: {
      ...((props.name && parent?.surfaces?.[props.name]?.surfaces) || {}),
      ...props.surfaces,
    },
  };

  return <SurfaceContext.Provider value={currentContext}>{nodes}</SurfaceContext.Provider>;
});

const resolveNodes = (
  components: Record<string, SurfaceComponent>,
  props: SurfaceProps,
  context: SurfaceProps | null,
  forwardedRef: ForwardedRef<HTMLElement>,
): ReactNode[] => {
  const data = {
    ...((props.name && context?.surfaces?.[props.name]?.data) || {}),
    ...props.data,
  };

  const nodes = Object.entries(components)
    .map(([key, component]): [string, SurfaceResult] | undefined => {
      const result = component({ ...props, data }, forwardedRef);
      if (!result || typeof result !== 'object') {
        return undefined;
      }

      return 'node' in result ? [key, result] : isValidElement(result) ? [key, { node: result }] : undefined;
    })
    .filter((result): result is [string, SurfaceResult] => Boolean(result))
    .sort(([, a], [, b]) => {
      const aDisposition = a.disposition ?? 'default';
      const bDisposition = b.disposition ?? 'default';

      if (aDisposition === bDisposition) {
        return 0;
      } else if (aDisposition === 'hoist' || bDisposition === 'fallback') {
        return -1;
      } else if (bDisposition === 'hoist' || aDisposition === 'fallback') {
        return 1;
      }

      return 0;
    })
    .map(([key, result]) => <Fragment key={key}>{result.node}</Fragment>);

  return props.limit ? nodes.slice(0, props.limit) : nodes;
};
