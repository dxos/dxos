//
// Copyright 2023 DXOS.org
//

import React, { type FC, type PropsWithChildren, createContext, useContext, forwardRef, type Ref } from 'react';

import { ErrorBoundary } from './ErrorBoundary';
import { type Plugin } from './Plugin';
import { usePlugins } from './PluginContext';

/**
 * Direction determines how multiple components are laid out.
 */
export type Direction = 'inline' | 'inline-reverse' | 'block' | 'block-reverse';

export type SurfaceProps = PropsWithChildren<{
  /**
   * Names allow nested surfaces to be specified in the parent context, similar to a slot.
   */
  name?: string;

  /**
   * Role defines how the data should be rendered.
   */
  role?: string;

  /**
   * The data to be rendered by the surface.
   */
  data?: any;

  /**
   * If specified, the Surface will lookup the component(s) by name and only render if found.
   */
  component?: string | string[];

  /**
   * If specified, the Surface will be wrapped in an error boundary.
   * The fallback component will be rendered if an error occurs.
   */
  fallback?: ErrorBoundary['props']['fallback'];

  /**
   * Configure nested surfaces.
   */
  surfaces?: Record<string, Partial<SurfaceProps>>;

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
}>;

type SurfaceContextValue = SurfaceProps & {
  parent?: SurfaceContextValue;
  root?: SurfaceContextValue;
};

const SurfaceContext = createContext<SurfaceContextValue | null>(null);

// If component is specified in props or context, grab a component by name.
// Otherwise, iterate through plugins where `plugin.provides.component(data)` returns something.
const resolveComponents = (
  plugins: Plugin[],
  props: SurfaceProps,
  context: SurfaceContextValue | null,
  forwardedRef: Ref<HTMLElement>,
) => {
  const componentName = props.component ?? (props.name && context?.surfaces?.[props.name]?.component);
  const data = props.data ?? (props.name && context?.surfaces?.[props.name]?.data);
  const role = props.role ?? (props.name && context?.surfaces?.[props.name]?.role);
  if (typeof componentName === 'string') {
    const Component = findComponent(plugins, componentName);
    return Component
      ? [
          <Component key={componentName} {...{ data, role }} ref={forwardedRef}>
            {props.children ?? null}
          </Component>,
        ]
      : [];
  } else if (Array.isArray(componentName)) {
    const components = componentName
      .map((name, index) => {
        const Component = findComponent(plugins, name);
        return (
          Component && (
            <Component key={name} {...{ data, role }} ref={forwardedRef}>
              {props.children ?? null}
            </Component>
          )
        );
      })
      .filter((Component): Component is JSX.Element => Boolean(Component));
    return props.limit ? components.slice(0, props.limit) : components;
  } else {
    const components = plugins
      .map((plugin, index) => {
        const Component = plugin.provides.component?.(data, role);
        return (
          Component && (
            <Component key={plugin.meta.id} {...{ data, role }} ref={forwardedRef}>
              {props.children ?? null}
            </Component>
          )
        );
      })
      .filter((Component): Component is JSX.Element => Boolean(Component));
    return props.limit ? components.slice(0, props.limit) : components;
  }
};

const findComponent = (plugins: Plugin[], name: string): FC<PropsWithChildren<any>> | undefined => {
  const nameParts = name.split('/');
  const componentId = nameParts.at(-1) ?? '';
  const pluginId = nameParts.slice(0, -1).join('/');
  return plugins.find((plugin) => plugin.meta.id === pluginId || plugin.meta.shortId === pluginId)?.provides
    .components?.[componentId];
};

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
export const Surface = forwardRef<HTMLElement, SurfaceProps>((props: SurfaceProps, forwardedRef) => {
  const context = useContext(SurfaceContext);
  const data = props.data ?? (props.name && context?.surfaces?.[props.name]?.data);
  const fallback = props.fallback ?? (props.name && context?.surfaces?.[props.name]?.fallback);

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

const SurfaceResolver = forwardRef<HTMLElement, SurfaceProps>((props: SurfaceProps, forwardedRef) => {
  const { plugins } = usePlugins();
  const parent = useContext(SurfaceContext);
  const components = resolveComponents(plugins, props, parent, forwardedRef);
  const currentContext = {
    ...((props.name && parent?.surfaces?.[props.name]) ?? {}),
    ...props,
    ...(parent ? { parent, root: parent.root ?? parent } : {}),
  };

  return <SurfaceContext.Provider value={currentContext}>{components}</SurfaceContext.Provider>;
});
