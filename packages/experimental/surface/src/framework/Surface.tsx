//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren, createContext, useContext } from 'react';

import { Plugin } from './Plugin';
import { usePluginContext } from './PluginContext';

export type Direction = 'inline' | 'inline-reverse' | 'block' | 'block-reverse';

export type SurfaceProps = PropsWithChildren<{
  name?: string;
  data?: any;
  component?: string | string[];
  role?: string;
  surfaces?: Record<string, Partial<SurfaceProps>>;
  limit?: number | undefined;
  direction?: Direction;
}>;

type SurfaceContextValue = SurfaceProps & {
  parent?: SurfaceContextValue;
  root?: SurfaceContextValue;
};

const SurfaceContext = createContext<SurfaceContextValue | null>(null);

export const useSurfaceContext = () => useContext(SurfaceContext);

// If component is specified in props or context, grab a component by name.
// Otherwise iterate through plugins where plugin.provides.component(datum) returns something.
const resolveComponents = (plugins: Plugin[], props: SurfaceProps, context: SurfaceContextValue | null) => {
  const componentName = props.component || (props.name && context?.surfaces?.[props.name]?.component);
  if (typeof componentName === 'string') {
    const Component = findComponent(plugins, componentName);
    return Component ? [<Component key={componentName}>{props.children ?? null}</Component>] : [];
  } else if (Array.isArray(componentName)) {
    const components = componentName
      .map((name) => {
        const Component = findComponent(plugins, name);
        return Component && <Component key={name}>{props.children ?? null}</Component>;
      })
      .filter((Component): Component is JSX.Element => Boolean(Component));
    return props.limit ? components.slice(0, props.limit) : components;
  } else {
    const components = plugins
      .map((plugin) => {
        const Component = plugin.provides.component?.(props.data, props.role);
        return (
          Component && (
            <Component data={props.data} role={props.role} key={plugin.meta.id}>
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
  const [pluginId, componentId] = name.split('/');
  return plugins.find((plugin) => plugin.meta.id === pluginId)?.provides.components?.[componentId];
};

export const Surface = (props: SurfaceProps) => {
  const { plugins } = usePluginContext();
  const parent = useSurfaceContext();
  const components = resolveComponents(plugins, props, parent);
  const currentContext = { ...props, ...(parent ? { parent, root: parent.root ?? parent } : {}) };
  return <SurfaceContext.Provider value={currentContext}>{components}</SurfaceContext.Provider>;
};
