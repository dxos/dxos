//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext, PropsWithChildren } from 'react';

import { composeContext } from './Context';
import { Plugin } from './Plugin';

export type PluginContextValue = {
  plugins: Plugin[];
};

const defaultContext: PluginContextValue = { plugins: [] };

const PluginContext = createContext<PluginContextValue>(defaultContext);

export const usePluginContext = () => useContext(PluginContext);

export const PluginContextProvider = (props: PropsWithChildren<PluginContextValue>) => {
  const { plugins } = props;
  const ComposedContext = composeContext(plugins);
  return (
    <PluginContext.Provider value={{ plugins }}>
      <ComposedContext>{props.children}</ComposedContext>
    </PluginContext.Provider>
  );
};
