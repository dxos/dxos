//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext } from 'react';

import { Plugin } from './Plugin';
import { usePluginContext } from './PluginContext';

export type Direction = 'inline' | 'inline-reverse' | 'block' | 'block-reverse';

export type SurfaceProps = PropsWithChildren<{
  name?: string;
  data?: any;
  component?: string | string[];
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

const resolveComponents = (plugins: Plugin[], props: SurfaceProps, context: SurfaceContextValue | null) => {
  // if specified in options.component, grab a component by name
  // otherwise iterate through plugins where plugin.provides.component(datum) returns something
  // pass children down to the components via plugin.provides.component(data, { children }) or just render any children otherwise

  return [];
};

export const Surface = (props: SurfaceProps) => {
  const { plugins } = usePluginContext();
  const parent = useSurfaceContext();
  const components = resolveComponents(plugins, props, parent);
  const currentContext = { ...props, ...(parent ? { parent, root: parent.root ?? parent } : {}) };
  return <SurfaceContext.Provider value={currentContext}>{components}</SurfaceContext.Provider>;
};
